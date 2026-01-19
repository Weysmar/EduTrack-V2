import { cn } from '@/lib/utils'
import { CourseGridItem } from '@/components/CourseGridItem'
import { CourseListItem } from '@/components/CourseListItem'

interface CourseContentProps {
    items: any[];
    viewMode: 'grid' | 'list';
    gridColumns: number;
    selectedItems: Set<string>;
    onToggleSelection: (id: string) => void;
    showThumbnails: boolean;
}

export function CourseContent({
    items,
    viewMode,
    gridColumns,
    selectedItems,
    onToggleSelection,
    showThumbnails
}: CourseContentProps) {
    // Grid Columns Class logic based on existing CourseView
    const gridColsClass = {
        4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
        5: 'grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
        6: 'grid-cols-1 md:grid-cols-5 lg:grid-cols-8 xl:grid-cols-6',
        10: 'grid-cols-2 md:grid-cols-5 lg:grid-cols-8 xl:grid-cols-10',
    }[gridColumns] || 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'

    return (
        <div className="flex-1 overflow-auto">
            <div className={cn(
                "gap-4 pb-20",
                viewMode === 'grid' ? `grid ${gridColsClass}` : "flex flex-col space-y-2"
            )}>
                {items?.map((item: any) => {
                    const isSelected = selectedItems.has(item.id)

                    if (viewMode === 'list') {
                        return (
                            <CourseListItem
                                key={item.id}
                                item={item}
                                isSelected={isSelected}
                                onToggleSelection={onToggleSelection}
                            />
                        )
                    }

                    return (
                        <CourseGridItem
                            key={item.id}
                            item={item}
                            isSelected={isSelected}
                            showThumbnails={showThumbnails}
                            onToggleSelection={onToggleSelection}
                        />
                    )
                })}
            </div>
        </div>
    )
}
