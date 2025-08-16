import {
  addMonths,
  format,
  isSameMonth,
  parseISO,
  subMonths
} from "date-fns";
import { useEffect, useMemo, useState } from "react";
import CreateTask from "../components/CreateTask";
import { isWeekenedsVisible, statusFilters, timeFilters } from "./Constants";
import { getWeeksInMonth, toISODate } from "./DateMethods";
import DayCell from "./DayCell";
import type { Filters, Task } from "./TaskInterface";
import { createNewTaskOnDay, handleSaveTask, tasksOnDay } from "./TaskMethods";
import TaskFilters from "../components/TaskFilters";

const DemoApp = () => {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  // ── State: tasks
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem("tasks");
    return saved ? JSON.parse(saved) : [];
  });
  // ── State: filtered list
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  // ── State: filters
  const [filters, setFilters] = useState<Filters>({
    selectedStatus: [],
    selectedTime: [],
    searchText: "",
  });

  // ── State: modal edit
  const [editTask, setEditTask] = useState<Partial<Task>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const weekdayLabels = useMemo(
    () =>
      isWeekenedsVisible
        ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        : ["Mon", "Tue", "Wed", "Thu", "Fri"],
    []
  );

  const eventsToShow: Task[] =
    filters.selectedStatus.length > 0 ||
    filters.selectedTime.length > 0 ||
    filters.searchText.length > 0
      ? filteredTasks
      : tasks;

  const daysInWeekFormat: Date[][] = useMemo(() => {
    const weeks = getWeeksInMonth(currentMonth);
    return weeks;
  }, [currentMonth]);

  const handleResetModal = () => {
    setIsModalOpen(false);
    setEditTask({});
  };

  const handleOpenModal = (task: Task) => {
    setIsModalOpen(true);
    setEditTask(task);
  };

  useEffect(() => {
      localStorage.setItem("tasks", JSON.stringify(tasks));
      applyFilters(tasks, filters);
    }, [tasks]);

 const weekHeights = useMemo(() => {
  return daysInWeekFormat.map((week) => {
    return Math.max(
      ...week.map((d) => {
        const dayISO = toISODate(d);
        const dayTasks = tasksOnDay(eventsToShow, dayISO);
        const taskHeight = 18; // or dynamic if tasks vary in height
        const minHeight = 120;
        return Math.max(minHeight, (dayTasks.length * (taskHeight  + 25)));
      })
    );
  });
}, [tasks]);

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
     useEffect(() => {
        applyFilters(tasks, filters);
      }, [filters]);
    
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
      
  return (
    <div className="demo-app">
      {/* Header with filters */}
      <header style={{ marginBottom: "1rem" }}>
        <h1 style={{ marginBottom: "0.5rem" }}>Team Task Scheduler</h1>
        <div
          className="filter-controls"
          style={{
            display: "flex",
            gap: "1rem",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
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
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              ← Prev
            </button>
            <div style={{ fontWeight: 600 }}>
              {format(currentMonth, "MMMM yyyy")}
            </div>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              Next →
            </button>
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
          position: "relative",
          
        }}
      >
        {weekdayLabels.map((lbl) => (
          <div key={lbl} style={{ textAlign: "center" }}>
            {lbl}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {daysInWeekFormat.map((week, i) => (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 4,
              position: "relative", // important: tasks inside can absolutely span multiple days
              minHeight: weekHeights[i],
            }}
          >
            {week.map((d) => {
              const dayISO = toISODate(d);
              const dayTasks = tasksOnDay(eventsToShow, dayISO);
              return (
                <DayCell
                  key={dayISO}
                  isCurrentMonth={isSameMonth(d, currentMonth)}
                  onDayClick={createNewTaskOnDay}
                  dayISO={dayISO}
                  dayDate={d}
                  setTasks={setTasks}
                  tasks={dayTasks}
                  handleOpenModal={handleOpenModal}
                  weekHeight={weekHeights[i]}
                />
              );
            })}
          </div>
        ))}
      </div>

      
      <CreateTask
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditTask({});
        }}
        onSave={() => handleSaveTask(setTasks, editTask, handleResetModal)}
        taskDetails={editTask}
        setTaskDetails={setEditTask}
      />
    </div>
  );
};

export default DemoApp;
