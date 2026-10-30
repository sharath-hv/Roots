interface Props {
  value: number;
  min?: number;
  max: number;
  onChange(value: number): void;
  label: string; // e.g. "Quantity of Alphonso mangoes, in kg"
  disabled?: boolean;
}

export function QuantityStepper({ value, min = 1, max, onChange, label, disabled }: Props) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" className="stepper__btn" onClick={() => onChange(value - 1)} disabled={disabled || value <= min} aria-label="Decrease">
        <span aria-hidden="true">−</span>
      </button>
      <output className="stepper__value" aria-live="polite">
        {value}
      </output>
      <button type="button" className="stepper__btn" onClick={() => onChange(value + 1)} disabled={disabled || value >= max} aria-label="Increase">
        <span aria-hidden="true">+</span>
      </button>
    </div>
  );
}
