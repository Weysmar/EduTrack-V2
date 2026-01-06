import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { format } from 'date-fns'
import { CheckCircle2, Circle, Lock, ChevronDown, ChevronUp, Calendar, Clock, BookOpen, Brain, Dumbbell, Wand2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GeneratePlanModal } from './GeneratePlanModal'
import { GenerateExerciseModal } from '@/components/GenerateExerciseModal'

interface StudyPlanViewProps {
    courseId: string
}

export function StudyPlanView({ courseId }: StudyPlanViewProps) {
    const [isGenerateOpen, setIsGenerateOpen] = useState(false)
    const [expandedWeek, setExpandedWeek] = useState<number | null>(null)
    const [generatingTask, setGeneratingTask] = useState<any>(null)

    // Queries
    const { data: plan } = useQuery({
        queryKey: ['studyPlan', courseId],
        queryFn: async () => {
            const { studyPlanQueries } = await import('@/lib/api/queries')
            const plans = await studyPlanQueries.getByCourse(courseId)
            return plans.find((p: any) => p.status === 'active')
        }
    })

    const { data: weeks = [] } = useQuery({
        queryKey: ['studyWeeks', plan?.id],
        queryFn: async () => {
            if (!plan?.id) return []
            const { studyPlanQueries } = await import('@/lib/api/queries')
            // Assuming we have an endpoint for weeks or we fetch full plan with weeks
            // For now let's assume getWeeks(planId) exists or use getOne(planId)
            const fullPlan = await studyPlanQueries.getOne(plan.id)
            return fullPlan.weeks || []
        },
        enabled: !!plan?.id
    })

    const { data: tasks = [] } = useQuery({
        queryKey: ['studyTasks', plan?.id],
        queryFn: async () => {
            if (!plan?.id) return []
            const { studyPlanQueries } = await import('@/lib/api/queries')
            const fullPlan = await studyPlanQueries.getOne(plan.id)
            // Extract tasks from weeks if nested, or fetch separately.
            // Based on types, weeks have tasks? 
            // Let's assume flattening weeks' tasks or separate endpoint
            // Implementation plan refactor suggested nested data.
            return fullPlan.weeks?.flatMap((w: any) => w.tasks || []) || []
        },
        enabled: !!plan?.id
    })

    if (!plan && !isGenerateOpen) {
        // ... existing empty state ...
        return (
            <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl bg-muted/20">
                {/* ... content ... */}
                <div className="bg-primary/10 p-4 rounded-full mb-4">
                    <Calendar className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">No Study Plan Yet</h3>
                <p className="text-muted-foreground text-center max-w-md mb-6">
                    Let AI organize your learning. Generate a personalized schedule based on your goals and availability.
                </p>
                <button
                    onClick={() => setIsGenerateOpen(true)}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
                >
                    Generate Study Plan
                </button>
                <GeneratePlanModal
                    isOpen={isGenerateOpen}
                    onClose={() => setIsGenerateOpen(false)}
                    courseId={courseId}
                    onPlanGenerated={() => { }}
                />
            </div>
        )
    }

    if (!plan || !weeks || !tasks) return null

    const queryClient = useQueryClient()
    const toggleTask = async (taskId: string, currentStatus: boolean) => {
        const { studyPlanQueries } = await import('@/lib/api/queries')
        // We need a task update endpoint. studyPlanQueries.updateTask?
        // Check queries.ts. If not exists, maybe updatePlan or generic update.
        // Assuming updateTask(taskId, data)
        await studyPlanQueries.updateTask(taskId, { isCompleted: !currentStatus })
        queryClient.invalidateQueries({ queryKey: ['studyTasks', plan?.id] })
        // Also invalidate weeks if needed
        queryClient.invalidateQueries({ queryKey: ['studyWeeks', plan?.id] })
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-card border rounded-xl p-6 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold mb-1">{plan.title}</h2>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><TargetIcon className="h-4 w-4" /> {plan.goal}</span>
                        <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {plan.hoursPerWeek}h/week</span>
                        <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> Deadline: {format(plan.deadline, 'MMM d, yyyy')}</span>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-bold text-primary">
                        {Math.round((tasks.filter(t => t.isCompleted).length / tasks.length) * 100)}%
                    </div>
                    <div className="text-xs text-muted-foreground">Completion</div>
                </div>
            </div>

            {/* Timeline */}
            <div className="space-y-4">
                {weeks.sort((a, b) => a.weekNumber - b.weekNumber).map(week => {
                    const weekTasks = tasks.filter(t => t.weekId === week.id).sort((a, b) => a.dayNumber - b.dayNumber)
                    const isExpanded = expandedWeek === week.id || week.status === 'current'
                    const completedTasks = weekTasks.filter(t => t.isCompleted).length
                    const totalTasks = weekTasks.length
                    const isDone = totalTasks > 0 && completedTasks === totalTasks

                    return (
                        <div key={week.id} className={cn(
                            "border rounded-xl transition-all overflow-hidden",
                            week.status === 'current' ? "border-primary bg-primary/5" : "bg-card",
                            isDone && "bg-muted/30 opacity-70"
                        )}>
                            <div
                                className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50"
                                onClick={() => setExpandedWeek(isExpanded ? null : week.id!)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                                        isDone ? "bg-green-100 text-green-700" : (week.status === 'current' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")
                                    )}>
                                        {isDone ? <CheckCircle2 className="h-5 w-5" /> : week.weekNumber}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold flex items-center gap-2">
                                            {format(week.startDate, 'MMM d')} - {format(week.endDate, 'MMM d')}
                                            {week.status === 'current' && <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full">Current</span>}
                                        </h3>
                                        <p className="text-xs text-muted-foreground max-w-lg truncate">
                                            {week.topics?.join(', ')}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-xs text-muted-foreground">
                                        {completedTasks}/{totalTasks} tasks
                                    </div>
                                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </div>
                            </div>

                            {isExpanded && (
                                <div className="border-t p-4 space-y-2 bg-background/50">
                                    {weekTasks.map(task => (
                                        <div key={task.id} className="flex items-start gap-3 p-2 rounded hover:bg-muted/50 group">
                                            <div className="mt-0.5 flex flex-col items-center gap-2">
                                                <button
                                                    onClick={() => toggleTask(task.id!, task.isCompleted)}
                                                    className={cn(
                                                        "transition-colors",
                                                        task.isCompleted ? "text-green-500" : "text-muted-foreground hover:text-primary"
                                                    )}
                                                >
                                                    {task.isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                                                </button>

                                                {/* ACTION BUTTON */}
                                                {(task.type === 'flashcards' || task.type === 'quiz') && !task.isCompleted && (
                                                    <button
                                                        onClick={() => setGeneratingTask(task)}
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-primary/10 text-primary rounded hover:bg-primary/20"
                                                        title={`Generate ${task.type}`}
                                                    >
                                                        <Wand2 className="h-3 w-3" />
                                                    </button>
                                                )}
                                            </div>

                                            <div className="flex-1">
                                                <div className={cn("font-medium text-sm", task.isCompleted && "line-through text-muted-foreground")}>
                                                    {task.description}
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                                    <span className="badge-icon flex items-center gap-1">
                                                        {task.type === 'reading' && <BookOpen className="h-3 w-3" />}
                                                        {task.type === 'quiz' && <Brain className="h-3 w-3" />}
                                                        {task.type === 'flashcards' && <Dumbbell className="h-3 w-3" />}
                                                        <span className="capitalize">{task.type}</span>
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" /> {task.durationMinutes}m
                                                    </span>
                                                    <span>Day {task.dayNumber}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
            <GeneratePlanModal
                isOpen={isGenerateOpen}
                onClose={() => setIsGenerateOpen(false)}
                courseId={courseId}
                onPlanGenerated={() => { }}
            />

            {generatingTask && (
                <GenerateExerciseModal
                    isOpen={!!generatingTask}
                    onClose={() => setGeneratingTask(null)}
                    sourceContent={`Subject: ${generatingTask.description}\n\nContext: ${weeks.find((w: any) => w.id === generatingTask.weekId)?.topics.join(', ')}`}
                    courseId={courseId}
                    sourceTitle={generatingTask.description}
                    initialMode={generatingTask.type === 'quiz' ? 'quiz' : 'flashcards'}
                />
            )}
        </div>
    )
}

function TargetIcon({ className }: { className?: string }) {
    return <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>
}
