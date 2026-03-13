"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { CheckIcon, PlusIcon, TrashIcon } from "@radix-ui/react-icons"
import { cn } from "@/lib/utils"

interface Todo {
    id: string;
    text: string;
    completed: boolean;
}

export function TodoList() {
    const [todos, setTodos] = React.useState<Todo[]>([])
    const [isLoaded, setIsLoaded] = React.useState(false)
    const [inputValue, setInputValue] = React.useState("")

    React.useEffect(() => {
        const saved = localStorage.getItem('recruit-todos')
        if (saved) {
            try {
                setTodos(JSON.parse(saved))
            } catch {
                // Ignore parse errors
            }
        }
        setIsLoaded(true)
    }, [])

    React.useEffect(() => {
        if (isLoaded) {
            localStorage.setItem('recruit-todos', JSON.stringify(todos))
        }
    }, [todos, isLoaded])

    const addTodo = () => {
        if (!inputValue.trim()) return
        setTodos(prev => [...prev, { id: crypto.randomUUID(), text: inputValue.trim(), completed: false }])
        setInputValue("")
    }

    const toggleTodo = (id: string) => {
        setTodos(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t))
    }

    const deleteTodo = (id: string) => {
        setTodos(prev => prev.filter(t => t.id !== id))
    }

    const hasCompleted = todos.some(t => t.completed)

    const clearCompleted = () => {
        setTodos(prev => prev.filter(t => !t.completed))
    }

    if (!isLoaded) return <div className="h-48 rounded-xl bg-bg-2 animate-pulse" />

    return (
        <Card variant="glass-premium" className="rounded-2xl">
            <CardHeader className="flex flex-row justify-between items-center group cursor-default">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <CheckIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <CardTitle className="text-lg">My To-Do Tasks</CardTitle>
                    </div>
                </div>
                {hasCompleted && (
                    <Button variant="ghost" size="sm" onClick={clearCompleted} className="text-xs font-bold text-text-3 hover:text-text-1 bg-transparent hover:bg-bg-2">
                        Clear Done
                    </Button>
                )}
            </CardHeader>
            <CardContent>
                <div className="flex gap-2 mb-4">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addTodo()}
                        placeholder="Add a new task..."
                        className="flex h-10 w-full rounded-xl border border-border bg-bg-2 px-3 py-2 text-sm placeholder:text-text-3 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent transition-all"
                    />
                    <Button variant="primary" size="icon" onClick={addTodo} className="shrink-0 rounded-xl !w-10 !h-10">
                        <PlusIcon className="w-4 h-4" />
                    </Button>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {todos.length === 0 ? (
                        <div className="text-sm text-text-3 py-8 text-center bg-bg-2/30 rounded-xl border-2 border-dashed border-border font-medium">
                            You have no tasks right now.
                        </div>
                    ) : (
                        todos.map(todo => (
                            <div key={todo.id} className="group p-3 bg-bg/50 hover:bg-surface border border-transparent hover:border-border rounded-xl flex justify-between items-start transition-all duration-200 hover:shadow-sm">
                                <div className="flex items-start gap-3 flex-1 overflow-hidden" onClick={() => toggleTodo(todo.id)} role="button">
                                    <button
                                        className={cn(
                                            "mt-0.5 shrink-0 w-[18px] h-[18px] rounded-full border-[1.5px] flex items-center justify-center transition-all",
                                            todo.completed ? "bg-primary border-primary text-white" : "border-text-4 hover:border-primary text-transparent"
                                        )}
                                    >
                                        <CheckIcon className="w-3 h-3" />
                                    </button>
                                    <span className={cn(
                                        "text-sm font-medium transition-all select-none leading-tight",
                                        todo.completed ? "text-text-4 line-through" : "text-text"
                                    )}>
                                        {todo.text}
                                    </span>
                                </div>
                                <button
                                    onClick={() => deleteTodo(todo.id)}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 text-text-4 hover:text-destructive hover:bg-destructive/10 rounded-md transition-all shrink-0 ml-2"
                                >
                                    <TrashIcon className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
