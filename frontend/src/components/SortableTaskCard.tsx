import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import TaskCard from './TaskCard'
import type { Task, Column } from '../App'

type Props = {
  task: Task
  columns: Column[]
  onDelete?: () => void
  onUpdate?: (updated: Task) => void
  onClick?: () => void
}

export default function SortableTaskCard({ task, columns, onDelete, onUpdate, onClick }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard
        task={task}
        columns={columns}
        onDelete={onDelete}
        onUpdate={onUpdate}
        onClick={onClick}
        isDragging={isDragging}
      />
    </div>
  )
}
