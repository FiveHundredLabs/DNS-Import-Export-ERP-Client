import { PurchaseOrder, PurchaseOrderItem } from '../../../types/purchasing';

export interface PaginatedPOItem {
  item: PurchaseOrderItem;
  itemNumber: number; // Global 1-based index across the entire PO (1 to N)
}

export interface POPageData {
  pageNumber: number; // 1-based (e.g. 1 of 3)
  totalPages: number; // Total page count
  isFirstPage: boolean;
  isLastPage: boolean;
  items: PaginatedPOItem[];
  showVendorMeta: boolean; // Full vendor & shipping info only on page 1
  showSummaryAndTerms: boolean; // Totals and terms on the final content page
  showSignatures: boolean; // Signatures on the final content page
  isStandaloneSignaturesPage?: boolean; // If an extra page was needed for terms & signatures
}

/**
 * Standard A4 printable height budget at 96 DPI:
 * Total page height: 1123px (297mm)
 * Printable vertical margin/padding: ~96px (48px top, 48px bottom)
 * Available vertical content budget: ~1020px
 */
const TOTAL_PAGE_BUDGET = 1010;

// Heights of document components in pixels
const FIRST_PAGE_HEADER_HEIGHT = 285; // Corporate header + Vendor info grid + Delivery destination
const CONTINUATION_HEADER_HEIGHT = 65; // Compact header (DNS logo, title, PO#, page indicator)
const TABLE_HEADER_HEIGHT = 38; // Table column header row
const SUMMARY_AND_TERMS_HEIGHT = 260; // Financial summary breakdown + Order notes + Delivery & general terms
const SIGNATURES_SECTION_HEIGHT = 145; // 3 signature blocks (Prepared By, Authorized By, Supplier Acceptance)
const FOOTER_PAGE_NUM_HEIGHT = 35; // Bottom page numbering & official system note

/**
 * Calculates the estimated row height in pixels based on content length and notes
 */
function estimateItemRowHeight(item: PurchaseOrderItem): number {
  let height = 38; // Base single-line row height
  if (item.productName && item.productName.length > 45) {
    height += 16; // Wrapped product title
  }
  if (item.notes && item.notes.trim().length > 0) {
    height += 18; // Line item notes
  }
  return height;
}

/**
 * Deterministic multi-page A4 pagination engine for Purchase Orders.
 * Correctly chunks line items, guarantees item numbers flow continuously (1..N),
 * places totals and terms once after the final item, and keeps signature blocks intact.
 */
export function paginatePurchaseOrder(purchaseOrder: PurchaseOrder): POPageData[] {
  const allItems: PaginatedPOItem[] = (purchaseOrder.items || []).map((item, index) => ({
    item,
    itemNumber: index + 1,
  }));

  const pages: POPageData[] = [];
  let itemIndex = 0;
  const totalItemCount = allItems.length;

  // Edge case: PO with 0 items
  if (totalItemCount === 0) {
    return [
      {
        pageNumber: 1,
        totalPages: 1,
        isFirstPage: true,
        isLastPage: true,
        items: [],
        showVendorMeta: true,
        showSummaryAndTerms: true,
        showSignatures: true,
      },
    ];
  }

  // --- PAGE 1 ALLOCATION ---
  // Determine if ALL items + summary + terms + signatures fit on Page 1
  const firstPageMaxForItemsWithEndBlocks =
    TOTAL_PAGE_BUDGET -
    FIRST_PAGE_HEADER_HEIGHT -
    TABLE_HEADER_HEIGHT -
    SUMMARY_AND_TERMS_HEIGHT -
    SIGNATURES_SECTION_HEIGHT -
    FOOTER_PAGE_NUM_HEIGHT;

  let totalItemsHeight = 0;
  for (const it of allItems) {
    totalItemsHeight += estimateItemRowHeight(it.item);
  }

  if (totalItemsHeight <= firstPageMaxForItemsWithEndBlocks) {
    // Single page PO: Everything fits on Page 1!
    return [
      {
        pageNumber: 1,
        totalPages: 1,
        isFirstPage: true,
        isLastPage: true,
        items: allItems,
        showVendorMeta: true,
        showSummaryAndTerms: true,
        showSignatures: true,
      },
    ];
  }

  // Multi-page PO: Allocate items to Page 1
  const firstPageBudgetWithoutEndBlocks =
    TOTAL_PAGE_BUDGET - FIRST_PAGE_HEADER_HEIGHT - TABLE_HEADER_HEIGHT - FOOTER_PAGE_NUM_HEIGHT;

  const page1Items: PaginatedPOItem[] = [];
  let p1HeightUsed = 0;

  while (itemIndex < totalItemCount) {
    const rowHeight = estimateItemRowHeight(allItems[itemIndex].item);
    if (p1HeightUsed + rowHeight > firstPageBudgetWithoutEndBlocks) {
      break;
    }
    p1HeightUsed += rowHeight;
    page1Items.push(allItems[itemIndex]);
    itemIndex++;
  }

  // Fallback: Ensure Page 1 has at least 1 item
  if (page1Items.length === 0 && itemIndex < totalItemCount) {
    page1Items.push(allItems[itemIndex]);
    itemIndex++;
  }

  pages.push({
    pageNumber: 1,
    totalPages: 1, // updated at the end
    isFirstPage: true,
    isLastPage: false,
    items: page1Items,
    showVendorMeta: true,
    showSummaryAndTerms: false,
    showSignatures: false,
  });

  // --- CONTINUATION PAGES ALLOCATION ---
  const continuationPageBudgetWithoutEndBlocks =
    TOTAL_PAGE_BUDGET - CONTINUATION_HEADER_HEIGHT - TABLE_HEADER_HEIGHT - FOOTER_PAGE_NUM_HEIGHT;

  const continuationPageBudgetWithEndBlocks =
    continuationPageBudgetWithoutEndBlocks - SUMMARY_AND_TERMS_HEIGHT - SIGNATURES_SECTION_HEIGHT;

  while (itemIndex < totalItemCount) {
    // Check if ALL remaining items can fit on this continuation page WITH Summary & Signatures
    let remainingHeight = 0;
    for (let i = itemIndex; i < totalItemCount; i++) {
      remainingHeight += estimateItemRowHeight(allItems[i].item);
    }

    if (remainingHeight <= continuationPageBudgetWithEndBlocks) {
      // All remaining items fit together with the end blocks on this page!
      const finalItems = allItems.slice(itemIndex);
      pages.push({
        pageNumber: pages.length + 1,
        totalPages: 0, // updated at the end
        isFirstPage: false,
        isLastPage: true,
        items: finalItems,
        showVendorMeta: false,
        showSummaryAndTerms: true,
        showSignatures: true,
      });
      itemIndex = totalItemCount;
      break;
    }

    // Otherwise, fill this continuation page with as many items as fit
    const currentPageItems: PaginatedPOItem[] = [];
    let currentHeightUsed = 0;

    while (itemIndex < totalItemCount) {
      const rowHeight = estimateItemRowHeight(allItems[itemIndex].item);
      if (currentHeightUsed + rowHeight > continuationPageBudgetWithoutEndBlocks) {
        break;
      }
      currentHeightUsed += rowHeight;
      currentPageItems.push(allItems[itemIndex]);
      itemIndex++;
    }

    if (currentPageItems.length === 0 && itemIndex < totalItemCount) {
      currentPageItems.push(allItems[itemIndex]);
      itemIndex++;
    }

    pages.push({
      pageNumber: pages.length + 1,
      totalPages: 0,
      isFirstPage: false,
      isLastPage: false,
      items: currentPageItems,
      showVendorMeta: false,
      showSummaryAndTerms: false,
      showSignatures: false,
    });
  }

  // --- FINAL CHECK: END BLOCKS PLACEMENT ---
  // If the last page does not yet have Summary & Signatures, check if it can accommodate them
  const lastPage = pages[pages.length - 1];
  if (!lastPage.showSummaryAndTerms) {
    let lastPageItemsHeight = 0;
    for (const it of lastPage.items) {
      lastPageItemsHeight += estimateItemRowHeight(it.item);
    }

    const availableSpace = continuationPageBudgetWithoutEndBlocks - lastPageItemsHeight;
    const requiredEndSpace = SUMMARY_AND_TERMS_HEIGHT + SIGNATURES_SECTION_HEIGHT;

    if (availableSpace >= requiredEndSpace) {
      // Fits comfortably on this page!
      lastPage.showSummaryAndTerms = true;
      lastPage.showSignatures = true;
      lastPage.isLastPage = true;
    } else {
      // Move Summary, Terms & Signatures to a dedicated final page
      pages.push({
        pageNumber: pages.length + 1,
        totalPages: 0,
        isFirstPage: false,
        isLastPage: true,
        items: [], // Standalone closing page with financial summary, terms & signatures
        showVendorMeta: false,
        showSummaryAndTerms: true,
        showSignatures: true,
        isStandaloneSignaturesPage: true,
      });
    }
  }

  // Update totalPages across all pages
  const totalPages = pages.length;
  pages.forEach((p, idx) => {
    p.pageNumber = idx + 1;
    p.totalPages = totalPages;
    p.isLastPage = idx === totalPages - 1;
  });

  return pages;
}
