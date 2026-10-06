import type { ReactNode } from 'react'

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  ORDER_RECEIVED:  { bg: '#e0f0ff', color: '#0070f3', label: 'Order Received' },
  IN_TRANSIT:      { bg: '#fff3d6', color: '#ab570a', label: 'In Transit' },
  DELIVERED:       { bg: '#d8ccf1', color: '#7928ca', label: 'Delivered' },
  DOCS_SENT:       { bg: '#f2f2f2', color: '#4d4d4d', label: 'Docs Sent' },
  PAYMENT_PENDING: { bg: '#ffefcf', color: '#ab570a', label: 'Payment Pending' },
  COMPLETED:       { bg: '#d4f7e8', color: '#0a6640', label: 'Completed' },
  IN_BETWEEN:      { bg: '#fafafa', color: '#8f8f8f', label: 'In Between' },
}

const CAT_STYLES: Record<string, { bg: string; color: string }> = {
  FUEL:          { bg: '#fff3d6', color: '#ab570a' },
  TOLL:          { bg: '#e0f0ff', color: '#0070f3' },
  CLEANING:      { bg: '#d4f7e8', color: '#0a6640' },
  OTHER_TRIP:    { bg: '#f2f2f2', color: '#4d4d4d' },
  MAINTENANCE:   { bg: '#fce8e8', color: '#c50000' },
  TYRE:          { bg: '#fce8e8', color: '#c50000' },
  BREAKDOWN:     { bg: '#fce8e8', color: '#c50000' },
  TAX:           { bg: '#e0f0ff', color: '#0070f3' },
  FASTAG:        { bg: '#e0f0ff', color: '#0070f3' },
  OTHER_TRUCK:   { bg: '#f2f2f2', color: '#4d4d4d' },
  HOUSEHOLD:     { bg: '#d8ccf1', color: '#7928ca' },
  GROCERY:       { bg: '#d4f7e8', color: '#0a6640' },
  MEDICAL:       { bg: '#fce8e8', color: '#c50000' },
  OTHER_PERSONAL:{ bg: '#f2f2f2', color: '#4d4d4d' },
}

interface BadgeProps {
  type: 'status' | 'category'
  value: string
  children?: ReactNode
}

export function Badge({ type, value }: BadgeProps) {
  const style =
    type === 'status'
      ? STATUS_STYLES[value]
      : CAT_STYLES[value]

  const label =
    type === 'status'
      ? (STATUS_STYLES[value]?.label ?? value)
      : value.replace(/_/g, ' ')

  const bg    = style?.bg    ?? '#f2f2f2'
  const color = style?.color ?? '#4d4d4d'

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 100,
        fontSize: 12,
        fontWeight: 500,
        background: bg,
        color,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  )
}
