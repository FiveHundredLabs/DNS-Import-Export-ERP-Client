import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface SelectContextValue {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchable?: boolean;
}

const SelectContext = React.createContext<SelectContextValue>({
  searchQuery: '',
  setSearchQuery: () => {},
  searchable: true,
});

const SelectGroup = SelectPrimitive.Group;

const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> & { error?: string }
>(({ className, children, error, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      'flex h-9 w-full items-center justify-between rounded-md border border-slate-200/90 bg-white px-3 py-1.5 text-sm font-normal text-slate-900 shadow-2xs transition-colors placeholder:text-slate-400 hover:bg-slate-50/80 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
      error && 'border-rose-500 focus:ring-rose-500',
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-70 shrink-0 ml-2" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = 'SelectTrigger';

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      'flex cursor-default items-center justify-center py-1 text-slate-500',
      className
    )}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      'flex cursor-default items-center justify-center py-1 text-slate-500',
      className
    )}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName;

interface SelectContentProps extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content> {
  searchable?: boolean;
  searchPlaceholder?: string;
}

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  SelectContentProps
>(({ className, children, position = 'popper', searchable = true, searchPlaceholder = 'Search...', ...props }, ref) => {
  const { searchQuery, setSearchQuery } = React.useContext(SelectContext);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Focus cursor on search input as soon as dropdown opens
  React.useEffect(() => {
    if (searchable) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [searchable]);

  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        className={cn(
          'relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-900 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
          position === 'popper' &&
            'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
          className
        )}
        position={position}
        {...props}
      >
        {searchable && (
          <div
            className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/90 p-1.5 backdrop-blur-xs"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Escape') {
                    // Let Escape propagate to close the select
                  }
                }}
                placeholder={searchPlaceholder}
                className="w-full rounded-md border border-slate-200 bg-white py-1 pl-8 pr-7 text-xs text-slate-800 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
              {searchQuery && (
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-2 flex h-4 w-4 items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        )}

        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            'p-1 overflow-y-auto max-h-60',
            position === 'popper' &&
              'w-full min-w-[var(--radix-select-trigger-width)]'
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
});
SelectContent.displayName = 'SelectContent';

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn('py-1.5 pl-8 pr-2 text-xs font-semibold text-slate-500', className)}
    {...props}
  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

interface SelectItemProps extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item> {
  searchKeywords?: string;
}

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  SelectItemProps
>(({ className, children, searchKeywords, ...props }, ref) => {
  const { searchQuery } = React.useContext(SelectContext);

  const isVisible = React.useMemo(() => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    if (searchKeywords && searchKeywords.toLowerCase().includes(q)) return true;

    // Helper to extract textual content from children
    const extractText = (node: React.ReactNode): string => {
      if (node === null || node === undefined) return '';
      if (typeof node === 'string' || typeof node === 'number') return String(node);
      if (Array.isArray(node)) return node.map(extractText).join(' ');
      if (React.isValidElement(node)) return extractText((node.props as { children?: React.ReactNode }).children);
      return '';
    };

    const text = extractText(children);
    return text.toLowerCase().includes(q) || String(props.value || '').toLowerCase().includes(q);
  }, [searchQuery, searchKeywords, children, props.value]);

  if (!isVisible) {
    return null;
  }

  return (
    <SelectPrimitive.Item
      ref={ref}
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors bg-white text-slate-800 hover:bg-slate-100 hover:text-slate-900 focus:bg-slate-100 focus:text-slate-900 data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-900 data-[state=checked]:bg-slate-50 data-[state=checked]:text-slate-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="h-4 w-4 text-primary" />
        </SelectPrimitive.ItemIndicator>
      </span>

      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
});
SelectItem.displayName = 'SelectItem';

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-slate-100', className)}
    {...props}
  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export interface SelectProps extends Omit<React.ComponentPropsWithoutRef<typeof SelectPrimitive.Root>, 'onChange'> {
  className?: string;
  error?: string;
  placeholder?: string;
  onChange?: (e: { target: { value: string } }) => void;
  id?: string;
  name?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
}

/**
 * Universal shadcn Select component with integrated search:
 * 1. Works with standard Radix compound components: <Select><SelectTrigger/><SelectContent/></Select>
 * 2. Works seamlessly with option children: <Select value={v} onChange={fn}><option value="a">A</option></Select>
 * Automatically equips dropdowns with search, cursor focus, scrollability, and keyboard support.
 */
const Select = ({
  children,
  className,
  error,
  placeholder,
  value,
  onValueChange,
  onChange,
  id,
  searchable = true,
  searchPlaceholder = 'Search options...',
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  ...props
}: SelectProps) => {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;
  const [searchQuery, setSearchQuery] = React.useState('');

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSearchQuery('');
    }
    if (controlledOnOpenChange) {
      controlledOnOpenChange(open);
    } else {
      setUncontrolledOpen(open);
    }
  };

  // Check if children contain a standard SelectTrigger
  let hasTrigger = false;
  interface OptionItem {
    type: 'item';
    value: string;
    label: React.ReactNode;
  }
  interface GroupItem {
    type: 'group';
    label: string;
    options: { value: string; label: React.ReactNode }[];
  }
  type RenderItem = OptionItem | GroupItem;

  const renderItems: RenderItem[] = [];
  const flatOptions: { value: string; label: React.ReactNode }[] = [];

  const extractOptions = (nodeChildren: React.ReactNode) => {
    React.Children.forEach(nodeChildren, (child) => {
      if (React.isValidElement(child)) {
        if (
          child.type === SelectTrigger ||
          (child.type as { displayName?: string })?.displayName === 'SelectTrigger'
        ) {
          hasTrigger = true;
        } else if (child.type === 'optgroup') {
          const groupLabel = String((child.props as { label?: string }).label || '');
          const groupOptions: { value: string; label: React.ReactNode }[] = [];
          React.Children.forEach((child.props as { children?: React.ReactNode }).children, (subChild) => {
            if (React.isValidElement(subChild) && subChild.type === 'option') {
              const val = String((subChild.props as { value?: unknown }).value ?? '');
              const lbl = (subChild.props as { children?: React.ReactNode }).children;
              groupOptions.push({ value: val, label: lbl });
              flatOptions.push({ value: val, label: lbl });
            }
          });
          if (groupOptions.length > 0) {
            renderItems.push({
              type: 'group',
              label: groupLabel,
              options: groupOptions,
            });
          }
        } else if (child.type === 'option') {
          const val = String((child.props as { value?: unknown }).value ?? '');
          const lbl = (child.props as { children?: React.ReactNode }).children;
          renderItems.push({
            type: 'item',
            value: val,
            label: lbl,
          });
          flatOptions.push({ value: val, label: lbl });
        }
      }
    });
  };

  extractOptions(children);

  const contextValue = React.useMemo<SelectContextValue>(
    () => ({
      searchQuery,
      setSearchQuery,
      searchable,
    }),
    [searchQuery, searchable]
  );

  // Standard shadcn compound component usage
  if (hasTrigger) {
    return (
      <SelectContext.Provider value={contextValue}>
        <SelectPrimitive.Root
          open={isOpen}
          onOpenChange={handleOpenChange}
          value={value !== undefined ? String(value) : undefined}
          onValueChange={(val) => {
            onValueChange?.(val);
            onChange?.({ target: { value: val } });
          }}
          {...props}
        >
          {children}
        </SelectPrimitive.Root>
      </SelectContext.Provider>
    );
  }

  // Automatic translation of <option> and <optgroup> children into accessible Radix Select
  const safeValue =
    value === '' || value === undefined
      ? flatOptions.some((o) => o.value === '')
        ? '__empty_val__'
        : undefined
      : String(value);

  const selectedOption = flatOptions.find(
    (o) =>
      o.value === (value ?? '') ||
      (safeValue === '__empty_val__' && o.value === '')
  );

  return (
    <div className="w-full">
      <SelectContext.Provider value={contextValue}>
        <SelectPrimitive.Root
          open={isOpen}
          onOpenChange={handleOpenChange}
          value={safeValue}
          onValueChange={(newVal) => {
            const actualVal = newVal === '__empty_val__' ? '' : newVal;
            onValueChange?.(actualVal);
            onChange?.({ target: { value: actualVal } });
          }}
          {...props}
        >
          <SelectTrigger className={className} error={error} id={id}>
            <SelectValue placeholder={placeholder || (selectedOption?.label ? undefined : 'Select option')}>
              {selectedOption?.label}
            </SelectValue>
          </SelectTrigger>
          <SelectContent searchable={searchable} searchPlaceholder={searchPlaceholder}>
            {renderItems.map((item, idx) => {
              if (item.type === 'group') {
                return (
                  <SelectGroup key={`grp-${idx}`}>
                    {item.label && <SelectLabel>{item.label}</SelectLabel>}
                    {item.options.map((opt, optIdx) => (
                      <SelectItem
                        key={opt.value ? opt.value : `grp-opt-${optIdx}`}
                        value={opt.value === '' ? '__empty_val__' : opt.value}
                      >
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                );
              }
              return (
                <SelectItem
                  key={item.value ? item.value : `item-${idx}`}
                  value={item.value === '' ? '__empty_val__' : item.value}
                >
                  {item.label}
                </SelectItem>
              );
            })}
          </SelectContent>
        </SelectPrimitive.Root>
      </SelectContext.Provider>
      {error && <p className="mt-1 text-[12.5px] font-medium text-rose-600 leading-normal">{error}</p>}
    </div>
  );
};

Select.displayName = 'Select';

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};

