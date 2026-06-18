import type { UnitSelection } from '@/features/resident/units'

function Selector({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string | undefined
  onChange: (value: string) => void
  options: { id: string; label: string }[]
}) {
  return (
    <label className="flex flex-1 flex-col gap-1">
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="border-input bg-background focus-visible:ring-ring/50 h-9 rounded-md border px-3 text-sm outline-none focus-visible:ring-[3px]"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

/** Selectores de propiedad y unidad; cada uno se oculta cuando hay una sola opción. */
export function UnitPicker({ selection }: { selection: UnitSelection }) {
  const { propertyList, unitList, selectedPropertyId, selectedUnitId, selectProperty, selectUnit } =
    selection
  if (propertyList.length <= 1 && unitList.length <= 1) return null
  return (
    <div className="flex flex-wrap gap-3">
      {propertyList.length > 1 && (
        <Selector
          label="Propiedad"
          value={selectedPropertyId}
          onChange={selectProperty}
          options={propertyList.map((p) => ({ id: p.id, label: p.name }))}
        />
      )}
      {unitList.length > 1 && (
        <Selector
          label="Unidad"
          value={selectedUnitId}
          onChange={selectUnit}
          options={unitList.map((u) => ({
            id: u.id,
            label: u.directoryName ? `${u.label} · ${u.directoryName}` : u.label,
          }))}
        />
      )}
    </div>
  )
}
