/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useEffect, useMemo, useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  parseISO,
  differenceInCalendarDays,
  isBefore,
} from "date-fns";

import {
  DndContext,
  closestCenter,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";

import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

import CreateTask from "../components/CreateTask";
import TaskFilters from "../components/TaskFilters";

/** ---------------- Types & Constants ---------------- */

interface Task {
  id: string;
  title: string;
  taskName: string;
  taskStatus: string;
  start: string; // ISO YYYY-MM-DD
  end: string; // ISO YYYY-MM-DD
  display?: string;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  isNew?: boolean;
}

interface Filters {
  selectedStatus: string[];
  selectedTime: number[];
  searchText: string;
}

const statusFilters: Record<string, string> = {
  "To Do": "#919191",
  "In Progress": "orange",
  Review: "#9d9df0",
  Completed: "#8ffb8f",
};

const timeFilters: Record<string, number> = {
  "Tasks within 1 week": 7,
  "Tasks within 2 weeks": 14,
  "Tasks within 3 weeks": 21,
};

// Utility: force YYYY-MM-DD from Date
const toISODate = (d: Date) => format(d, "yyyy-MM-dd");

// Utility: clamp start <= end
const clampRange = (startISO: string, endISO: string) => {
  const s = parseISO(startISO);
  const e = parseISO(endISO);
  return isBefore(e, s) ? { start: endISO, end: startISO } : { start: startISO, end: endISO };
};

// Collision data types
type DragData =
  | { type: "task"; taskId: string; dayISO: string } // dragging a task body (move/reorder)
  | { type: "resize"; edge: "start" | "end"; taskId: string; originISO: string }; // resizing

/** ---------------- DemoApp ---------------- */

const DemoApp: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [weekendsVisible] = useState(true);

  // ── State: tasks
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem("tasks");
    return saved ? JSON.parse(saved) : [];
  });

  // ── State: filters
  const [filters, setFilters] = useState<Filters>({
    selectedStatus: [],
    selectedTime: [],
    searchText: "",
  });

  // ── State: filtered list
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);

  // ── State: modal edit
  const [editTask, setEditTask] = useState<Partial<Task>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ── State: per-day custom order (keeps stable order across reorders)
  const [dayOrder, setDayOrder] = useState<Record<string, string[]>>({});

  // ── Active drag for overlay
  const [activeDrag, setActiveDrag] = useState<DragData | null>(null);

  // ── Which day header has the Add button visible (null = none)
  const [activeAddDay, setActiveAddDay] = useState<string | null>(null);

  // Sensors
  const sensors = useSensors(useSensor(MouseSensor), useSensor(TouchSensor));

  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks));
    applyFilters(tasks, filters);
  }, [tasks]);

  useEffect(() => {
    applyFilters(tasks, filters);
  }, [filters]);

  useEffect(() => {
    document.title = "Task Manager App";
  }, []);

  // hide activeAddDay when clicking outside (so the button doesn't stick)
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      // if clicked inside a header element, keep it
      if (target.closest(".day-header") || target.closest(".add-button")) return;
      setActiveAddDay(null);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  /** ---------------- Month grid generation ---------------- */
  const daysInView: Date[] = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sun
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const days: Date[] = [];
    let d = gridStart;
    while (d <= gridEnd) {
      days.push(d);
      d = addDays(d, 1);
    }
    return days;
  }, [currentMonth]);

  const weekdayLabels = useMemo(
    () => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    []
  );

  /** ---------------- Filtering ---------------- */
  const applyFilters = (all: Task[], f: Filters) => {
    const today = new Date();
    const result = all.filter((task) => {
      const statusMatch =
        f.selectedStatus.length === 0 ||
        f.selectedStatus.includes(task.taskStatus);

      const timeMatch =
        f.selectedTime.length === 0 ||
        f.selectedTime.some((days) => {
          const dueDate = parseISO(task.end || task.start);
          const diffDays = Math.ceil(
            (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );
          return diffDays <= days && diffDays >= 0;
        });

      const text = f.searchText?.trim().toLowerCase();
      const textMatch =
        !text ||
        task.taskName?.toLowerCase().includes(text) ||
        task.title?.toLowerCase().includes(text);

      return statusMatch && timeMatch && textMatch;
    });

    setFilteredTasks(result);
  };

  const eventsToShow: Task[] =
    filters.selectedStatus.length > 0 ||
    filters.selectedTime.length > 0 ||
    filters.searchText.length > 0
      ? filteredTasks
      : tasks;

  /** ---------------- Helpers: tasks per day + order ---------------- */
  const computeTasksOnDay = (all: Task[], dayISO: string): Task[] => {
    const d = parseISO(dayISO);
    return all.filter((t) => {
      const s = parseISO(t.start);
      const e = parseISO(t.end || t.start);
      return d >= s && d <= e;
    });
  };

  const visibleDaysTaskIds = useMemo(() => {
    const map: Record<string, string[]> = {};
    daysInView.forEach((d) => {
      const dayISO = toISODate(d);
      const list = computeTasksOnDay(eventsToShow, dayISO);
      map[dayISO] = list.map((t) => t.id);
    });
    return map;
  }, [daysInView, eventsToShow]);

  useEffect(() => {
    setDayOrder((prev) => {
      let changed = false;
      const next: Record<string, string[]> = { ...prev };

      Object.entries(visibleDaysTaskIds).forEach(([dayISO, ids]) => {
        const existing = next[dayISO] || [];
        const kept = existing.filter((id) => ids.includes(id));
        const toAppend = ids.filter((id) => !kept.includes(id));
        const combined = [...kept, ...toAppend];
        if (combined.length !== existing.length || combined.some((v, i) => v !== existing[i])) {
          next[dayISO] = combined;
          changed = true;
        }
      });

      Object.keys(next).forEach((dayISO) => {
        if (!(dayISO in visibleDaysTaskIds)) {
          delete next[dayISO];
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [visibleDaysTaskIds]);

  const tasksOnDay = (dayISO: string): Task[] => {
    const list = computeTasksOnDay(eventsToShow, dayISO);
    const order = dayOrder[dayISO];
    if (!order || order.length === 0) return list;
    const map = new Map(list.map((t) => [t.id, t]));
    const ordered: Task[] = [];
    order.forEach((id) => {
      const item = map.get(id);
      if (item) {
        ordered.push(item);
        map.delete(id);
      }
    });
    if (map.size) ordered.push(...Array.from(map.values()));
    return ordered;
  };

  /** ---------------- Handlers: Filters UI ---------------- */
  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { checked, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      selectedStatus: checked
        ? [...prev.selectedStatus, value]
        : prev.selectedStatus.filter((s) => s !== value),
    }));
  };

  const handleTimeFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { checked, value } = e.target;
    setFilters((prev) => {
      const val = timeFilters[value as keyof typeof timeFilters];
      return {
        ...prev,
        selectedTime: checked
          ? [...prev.selectedTime, val]
          : prev.selectedTime.filter((n) => n !== val),
      };
    });
  };

  const handleSearchTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({ ...prev, searchText: e.target.value }));
  };

  const clearFilters = () => {
    setFilters({ selectedStatus: [], selectedTime: [], searchText: "" });
  };

  /** ---------------- Handlers: Task modal save ---------------- */
  const handleSaveTask = () => {
    setTasks((prev) =>
      prev.map((evt) =>
        evt.id === editTask.id
          ? {
              ...evt,
              title: editTask.taskName || "",
              taskName: editTask.taskName || "",
              taskStatus: editTask.taskStatus || "",
              display: editTask.display || "block",
              backgroundColor: editTask.backgroundColor || "#d4f5d4",
              borderColor: editTask.borderColor || "#2ecc71",
              textColor: editTask.textColor || "#2c3e50",
              isNew: editTask.isNew === true ? false : false,
            }
          : evt
      )
    );
    setIsModalOpen(false);
    setEditTask({});
  };

  /** ---------------- DnD: Handlers ---------------- */
  const onDragStart = (evt: any) => {
    setActiveDrag(evt.active.data?.current ?? null);
  };

  const onDragEnd = (evt: any) => {
    const { active, over } = evt;
    setActiveDrag(null);
    if (!over || !active?.data?.current) return;

    const a: DragData = active.data.current;
    const overDayISO = over.data?.current?.dayISO as string | undefined;
    const overTaskData = over.data?.current?.task as
      | { taskId: string; dayISO: string }
      | undefined;

    // --- Resize mode ---
    if (a.type === "resize") {
      if (!overDayISO) return; // must drop on a day cell
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== a.taskId) return t;
          if (a.edge === "start") {
            const clamped = clampRange(overDayISO, t.end || t.start);
            return { ...t, start: clamped.start, end: clamped.end };
          } else {
            const clamped = clampRange(t.start, overDayISO);
            return { ...t, start: clamped.start, end: clamped.end };
          }
        })
      );
      return;
    }

    // --- Move / Reorder mode ---
    if (a.type === "task") {
      const movingTask = tasks.find((t) => t.id === a.taskId);
      if (!movingTask) return;

      // Case 1: Dropped on another task -> reorder (same day) or move+insert
      if (overTaskData) {
        const targetDay = overTaskData.dayISO;
        const sourceDay = a.dayISO;

        if (sourceDay === targetDay) {
          // Reorder within same day
          setDayOrder((prev) => {
            const order = prev[sourceDay] ? [...prev[sourceDay]] : [];
            const from = order.indexOf(movingTask.id);
            const to = order.indexOf(overTaskData.taskId);
            if (from === -1 || to === -1) return prev;
            const newOrder = arrayMove(order, from, to);
            return { ...prev, [sourceDay]: newOrder };
          });
        } else {
          // Move to another day and insert before target
          setTasks((prev) => {
            const delta =
              differenceInCalendarDays(parseISO(targetDay), parseISO(sourceDay));
            const newStart = toISODate(addDays(parseISO(movingTask.start), delta));
            const newEnd = toISODate(addDays(parseISO(movingTask.end || movingTask.start), delta));
            return prev.map((t) =>
              t.id === movingTask.id ? { ...t, start: newStart, end: newEnd } : t
            );
          });

          // Update orders: remove from source, insert into target before targetId
          setDayOrder((prev) => {
            const next = { ...prev };
            const src = next[sourceDay] ? [...next[sourceDay]] : [];
            const tgt = next[targetDay] ? [...next[targetDay]] : [];

            // remove from source
            const idx = src.indexOf(movingTask.id);
            if (idx > -1) src.splice(idx, 1);
            next[sourceDay] = src;

            // insert before overTaskData.taskId in target
            const at = tgt.indexOf(overTaskData.taskId);
            const insertAt = at >= 0 ? at : tgt.length;
            // prevent duplicate before insert
            const existingIdx = tgt.indexOf(movingTask.id);
            if (existingIdx > -1) tgt.splice(existingIdx, 1);
            tgt.splice(insertAt, 0, movingTask.id);
            next[targetDay] = tgt;

            return next;
          });
        }
        return;
      }

      // Case 2: Dropped on empty day cell -> move there (push to end)
      if (overDayISO) {
        const sourceDay = a.dayISO;
        const targetDay = overDayISO;

        setTasks((prev) => {
          const delta =
            differenceInCalendarDays(parseISO(targetDay), parseISO(sourceDay));
          const newStart = toISODate(addDays(parseISO(movingTask.start), delta));
          const newEnd = toISODate(addDays(parseISO(movingTask.end || movingTask.start), delta));
          return prev.map((t) =>
            t.id === movingTask.id ? { ...t, start: newStart, end: newEnd } : t
          );
        });

        // Update day orders: remove from source, push to end of target
        setDayOrder((prev) => {
          const next = { ...prev };
          const src = next[sourceDay] ? [...next[sourceDay]] : [];
          const tgt = next[targetDay] ? [...next[targetDay]] : [];

          const idx = src.indexOf(movingTask.id);
          if (idx > -1) src.splice(idx, 1);
          next[sourceDay] = src;

          if (!tgt.includes(movingTask.id)) tgt.push(movingTask.id);
          next[targetDay] = tgt;

          return next;
        });
      }
    }
  };

  /** ---------------- UI: Create new task ---------------- */
  const createNewTaskOnDay = (dayISO: string) => {
    const newTask: Task = {
      id: crypto.randomUUID(),
      title: "➕ New Task",
      taskName: "",
      taskStatus: "",
      start: dayISO,
      end: dayISO,
      display: "block",
      isNew: true,
      backgroundColor: "#d4f5d4",
      borderColor: "#2ecc71",
      textColor: "#2c3e50",
    };
    setTasks((prev) => [...prev, newTask]);
    setEditTask(newTask);
    setIsModalOpen(true);
    // add to end of that day's order
    setDayOrder((prev) => {
      const arr = prev[dayISO] ? [...prev[dayISO]] : [];
      arr.push(newTask.id);
      return { ...prev, [dayISO]: arr };
    });
    // hide add button after creating
    setActiveAddDay(null);
  };

  /** ---------------- Render ---------------- */
  return (
    <div className="demo-app" style={{ padding: 12 }}>
      {/* Header with filters */}
      <header style={{ marginBottom: "1rem" }}>
        <h1 style={{ marginBottom: "0.5rem" }}>Team Task Scheduler</h1>
        <div
          className="filter-controls"
          style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}
        >
          {/* Keep TaskFilters API EXACTLY the same */}
          <TaskFilters
            options={statusFilters}
            handleChange={handleStatusFilterChange}
            selectedValues={filters.selectedStatus}
          />
          <TaskFilters
            options={timeFilters}
            handleChange={handleTimeFilterChange}
            selectedValues={filters.selectedTime}
          />
          <input
            value={filters.searchText}
            onChange={handleSearchTextChange}
            placeholder="Search tasks..."
            style={{ padding: "4px 8px" }}
          />
          <button onClick={clearFilters}>Clear Filters</button>

          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>← Prev</button>
            <div style={{ fontWeight: 600 }}>{format(currentMonth, "MMMM yyyy")}</div>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>Next →</button>
          </div>
        </div>
      </header>

      {/* Weekday labels */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 4,
          marginBottom: 4,
          fontWeight: 600,
        }}
      >
        {weekdayLabels.map((lbl) => (
          <div key={lbl} style={{ textAlign: "center" }}>
            {lbl}
          </div>
        ))}
      </div>

      {/* Calendar Grid with DnD */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {daysInView.map((d) => {
            const dayISO = toISODate(d);
            const dayTasks = tasksOnDay(dayISO);

            return (
              <DayCell
                key={dayISO}
                dayDate={d}
                dayISO={dayISO}
                isCurrentMonth={isSameMonth(d, currentMonth)}
                weekendsVisible={weekendsVisible}
                tasks={dayTasks}
                activeAddDay={activeAddDay}
                onDayClick={(iso) => setActiveAddDay(prev => prev === iso ? null : iso)}
                onCreate={() => createNewTaskOnDay(dayISO)}
                onClickTask={(t) => {
                  setEditTask(t);
                  setIsModalOpen(true);
                }}
              />
            );
          })}
        </div>

        {/* Drag Preview */}
        <DragOverlay>
          {activeDrag?.type === "task" ? (
            <TaskChip task={tasks.find((t) => t.id === activeDrag.taskId)!} isPreview />
          ) : activeDrag?.type === "resize" ? (
            <div style={{ padding: "4px 6px", background: "#e5e7eb", border: "1px dashed #999", borderRadius: 4, fontSize: 12 }}>
              {activeDrag.edge === "start" ? "Resize Start" : "Resize End"}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Modal (unchanged API) */}
      <CreateTask
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditTask({});
        }}
        onSave={handleSaveTask}
        taskDetails={editTask}
        setTaskDetails={setEditTask}
      />
    </div>
  );
};

export default DemoApp;

/** ---------------- Day Cell ---------------- */

function DayCell(props: {
  dayDate: Date;
  dayISO: string;
  isCurrentMonth: boolean;
  weekendsVisible: boolean;
  tasks: Task[];
  activeAddDay: string | null;
  onDayClick: (iso: string) => void;
  onCreate: () => void;
  onClickTask: (task: Task) => void;
}) {
  const {
    dayDate,
    dayISO,
    isCurrentMonth,
    tasks,
    onDayClick,
    onCreate,
    onClickTask,
    activeAddDay,
  } = props;

  const { setNodeRef, isOver } = useDroppable({
    id: dayISO,
    data: { type: "day", dayISO },
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        border: "1px solid #e5e7eb",
        minHeight: 120,
        background: isCurrentMonth ? "#fff" : "#f8fafc",
        outline: isOver ? "2px dashed #3b82f6" : "none",
        padding: 6,
        borderRadius: 6,
        display: "flex",
        flexDirection: "column",
        cursor: "pointer",
      }}
      onClick={() => onDayClick(dayISO)} // 🔹 Click anywhere in the cell
    >
      <div
        className="day-header"
        style={{ display: "flex", alignItems: "center", marginBottom: 6 }}
      >
        <div style={{ fontWeight: 600 }}>{format(dayDate, "d")}</div>

        {activeAddDay === dayISO && (
          <button
            className="add-button"
            style={{
              marginLeft: "auto",
              fontSize: 12,
              background: "#eef2ff",
              border: "1px solid #c7d2fe",
              color:"black",
              borderRadius: 4,
              padding: "2px 6px",
              cursor: "pointer",
            }}
            onClick={(e) => {
              e.stopPropagation(); // prevent triggering cell click
              onCreate();
            }}
            title="Add task to this day"
          >
            + Add
          </button>
        )}
      </div>

      <SortableContext
        items={tasks.map((t) => `${t.id}@${dayISO}`)}
        strategy={verticalListSortingStrategy}
      >
           {tasks.map((t) => (
      <SortableTaskRow
        key={`${t.id}@${dayISO}`}
        task={t}
        dayISO={dayISO}
        onClick={(e: { stopPropagation: () => void; }) => {
          e.stopPropagation(); // avoid triggering onDayClick when selecting task
          onClickTask(t);
        }}
      />
    ))}
      </SortableContext>
    </div>
  );
}


/** ---------------- Task Row (sortable + resize handles) ---------------- */

function SortableTaskRow({ task, dayISO, onClick }: { task: Task; dayISO: string; onClick: () => void }) {
  // Sortable per-day composite id
  const compositeId = `${task.id}@${dayISO}`;

  const sortable = useSortable({
    id: compositeId,
    data: { type: "task", taskId: task.id, dayISO } as DragData,
  });

  const resizeStart = useDraggable({
    id: `resize-start-${task.id}@${dayISO}`,
    data: { type: "resize", edge: "start", taskId: task.id, originISO: dayISO } as DragData,
  });

  const resizeEnd = useDraggable({
    id: `resize-end-${task.id}@${dayISO}`,
    data: { type: "resize", edge: "end", taskId: task.id, originISO: dayISO } as DragData,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    opacity: sortable.isDragging ? 0.6 : 1,
  };

  return (
    <div ref={sortable.setNodeRef} style={{ ...style, marginBottom: 6 }} {...sortable.attributes} {...sortable.listeners}>
      <TaskChip
        task={task}
        onClick={onClick}
        onDoubleClick={(e) => {
          e.stopPropagation(); // important: prevent header double-click from catching this
          onClick();
        }}
      >
        {/* Left resize handle */}
        <span
          ref={resizeStart.setNodeRef as any}
          {...resizeStart.listeners}
          {...resizeStart.attributes}
          title="Drag to change start date"
          style={{
            cursor: "ew-resize",
            padding: "0 6px",
            userSelect: "none",
            fontWeight: 700,
          }}
        >
          ‹
        </span>

        {/* Title */}
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{task.title || task.taskName}</span>

        {/* Right resize handle */}
        <span
          ref={resizeEnd.setNodeRef as any}
          {...resizeEnd.listeners}
          {...resizeEnd.attributes}
          title="Drag to change end date"
          style={{
            cursor: "ew-resize",
            padding: "0 6px",
            userSelect: "none",
            fontWeight: 700,
          }}
        >
          ›
        </span>
      </TaskChip>
    </div>
  );
}

/** ---------------- Task Chip (visual) ---------------- */

function TaskChip({ task, children, onClick, onDoubleClick, isPreview }: { task: Task; children?: React.ReactNode; onClick?: () => void; onDoubleClick?: (e: React.MouseEvent) => void; isPreview?: boolean; }) {
  const statusColor = statusFilters[task.taskStatus as keyof typeof statusFilters] || task.backgroundColor || "#94a3b8";

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      onDoubleClick={(e) => {
        // don't let parent header double-click take this
        e.stopPropagation();
        onDoubleClick?.(e);
      }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: statusColor,
        color: task.textColor || "#0f172a",
        border: `1px solid ${task.borderColor || "transparent"}`,
        padding: "4px 6px",
        borderRadius: 6,
        fontSize: 12,
        cursor: isPreview ? "grabbing" : "grab",
        boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
      }}
    >
      {children ?? <span style={{ fontWeight: 600 }}>{task.title || task.taskName}</span>}
    </div>
  );
}
