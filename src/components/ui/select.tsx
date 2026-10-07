import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../utils/cn';

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

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
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
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          'p-1',
          position === 'popper' &&
            'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]'
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
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

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
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
));
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
}

/**
 * Universal shadcn Select component:
 * 1. Works with standard Radix compound components: <Select><SelectTrigger/><SelectContent/></Select>
 * 2. Works seamlessly with option children: <Select value={v} onChange={fn}><option value="a">A</option></Select>
 * 100% Radix-based, avoiding default native HTML <select> dropdowns everywhere.
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
  ...props
}: SelectProps) => {
  // Check if children contain a standard SelectTrigger
  let hasTrigger = false;
  const optionList: { value: string; label: React.ReactNode }[] = [];

  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child)) {
      if (
        child.type === SelectTrigger ||
        (child.type as { displayName?: string })?.displayName === 'SelectTrigger'
      ) {
        hasTrigger = true;
      } else if (child.type === 'option') {
        optionList.push({
          value: String(child.props.value ?? ''),
          label: child.props.children,
        });
      }
    }
  });

  // Standard shadcn compound component usage
  if (hasTrigger) {
    return (
      <SelectPrimitive.Root
        value={value !== undefined ? String(value) : undefined}
        onValueChange={(val) => {
          onValueChange?.(val);
          onChange?.({ target: { value: val } });
        }}
        {...props}
      >
        {children}
      </SelectPrimitive.Root>
    );
  }

  // Automatic translation of <option> children into accessible Radix Select
  const safeValue =
    value === '' || value === undefined
      ? optionList.some((o) => o.value === '')
        ? '__empty_val__'
        : undefined
      : String(value);

  const selectedOption = optionList.find(
    (o) =>
      o.value === (value ?? '') ||
      (safeValue === '__empty_val__' && o.value === '')
  );

  return (
    <div className="w-full">
      <SelectPrimitive.Root
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
        <SelectContent>
          {optionList.map((opt, idx) => (
            <SelectItem
              key={opt.value ? opt.value : `empty-${idx}`}
              value={opt.value === '' ? '__empty_val__' : opt.value}
            >
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </SelectPrimitive.Root>
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
