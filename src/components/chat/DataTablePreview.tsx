// src/components/chat/DataTablePreview.tsx
'use client'

import { Product } from '@/app/page'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'

// Prop interface for the component
interface DataTablePreviewProps {
  // The component can receive an array of Product objects or null if there's no data yet.
  data: Product[] | null
}

/**
 * Renders a preview table for the extracted product data.
 */
export const DataTablePreview = ({ data }: DataTablePreviewProps) => {
  // If there's no data, we don't render anything from this component.
  // The parent page.tsx will handle showing the placeholder message.
  if (!data || data.length === 0) {
    return null
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[150px]">Group</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Limit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((product, index) => (
            <TableRow key={index}>
              <TableCell className="font-medium">{product.group}</TableCell>
              <TableCell>{product.name}</TableCell>
              <TableCell>{product.description}</TableCell>
              <TableCell className="text-right">{product.price}</TableCell>
              <TableCell className="text-right">{product.limit}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
