/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import type { DateSelectArg, EventClickArg, EventContentArg } from "@fullcalendar/core";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import CreateTask from "../components/CreateTask";
import TaskFilters from "../components/TaskFilters";


interface Task {
  id: string;
  title: string;
  taskName: string;
  taskStatus: string;
  start: string;
  end: string;
  display?: string;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  isNew? : boolean
}

interface Filters {
  selectedStatus: string[];
  selectedTime: number[];
  searchText: string;
}

const statusFilters = {
  "To Do": "#919191",
  "In Progress": "orange",
  Review: "#9d9df0",
  Completed: "#8ffb8f",
};

const timeFilters = {
  "Tasks within 1 week": 7,
  "Tasks within 2 weeks": 14,
  "Tasks within 3 weeks": 21,
};

const DemoApp: React.FC = () => {
  const [weekendsVisible] = useState(true);
  const [tasks, setTasks] = useState<Task[]>(() => {
    const savedTasks = localStorage.getItem("tasks");
    return savedTasks
      ? JSON.parse(savedTasks)
      : [
          // {
          //   id: crypto.randomUUID(),
          //   title: "Meeting",
          //   taskName: "Initial Meeting",
          //   taskStatus: "To Do",
          //   start: new Date().toISOString().split("T")[0],
          //   display: "block",
          //   backgroundColor: "#d4f5d4",
          //   borderColor: "#2ecc71",
          //   textColor: "#2c3e50",
          // },
        ];
  });
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [editTask, setEditTask] = useState<Partial<Task>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    selectedStatus: [],
    selectedTime: [],
    searchText: "",
  });

  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks));
    applyFilters();
  }, [tasks]);

  useEffect(() => {
    applyFilters();
  }, [filters]);

  useEffect(() => {
    document.title = "Task Manager App";
  }, []);

  const applyFilters = () => {
    const today = new Date();
    const result = tasks.filter((task) => {
      const statusMatch =
        filters.selectedStatus.length === 0 ||
        filters.selectedStatus.includes(task.taskStatus);

      const timeMatch =
        filters.selectedTime.length === 0 ||
        filters.selectedTime.some((days) => {
          const dueDate = new Date(task.end || task.start);
          const diffDays = Math.ceil(
            (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );
          return diffDays <= days && diffDays >= 0;
        });

      const textMatch =
        !filters.searchText ||
        (task.taskName &&
          task.taskName
            .toLowerCase()
            .includes(filters.searchText.toLowerCase()));

      return statusMatch && timeMatch && textMatch;
    });

    setFilteredTasks(result);
  };

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    const newTask = {
      id: crypto.randomUUID(),
      title: "➕ New Task",
      taskName: "",
      taskStatus: "",
      start: selectInfo.startStr,
      end: selectInfo.endStr,
      display: "block",
      isNew: true,
      backgroundColor: "#d4f5d4",
      borderColor: "#2ecc71",
      textColor: "#2c3e50",
    };

    setTasks((prev) => [...prev, newTask]);
    setEditTask(newTask);
    setIsModalOpen(true);
    selectInfo.view.calendar.unselect();
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const task = {
      id: clickInfo.event.id,
      title: clickInfo.event.title,
      taskName: clickInfo.event.extendedProps.taskName ,
      taskStatus: clickInfo.event.extendedProps.taskStatus || "",
      start: clickInfo.event.startStr,
      end: clickInfo.event.endStr,
      display: clickInfo.event.extendedProps.display,
      backgroundColor: clickInfo.event.backgroundColor,
      borderColor: clickInfo.event.borderColor,
      textColor: clickInfo.event.textColor,
      isNew: clickInfo.event.extendedProps.isNew
    };
    setEditTask(task);
    setIsModalOpen(true);
  };

  const handleEventResize = (info: any) => {
    setTasks((prev) =>
      prev.map((evt) =>
        evt.id === info.event.id
          ? { ...evt, start: info.event.startStr, end: info.event.endStr }
          : evt
      )
    );
  };

  const handleEventDrop = (info: any) => {
    setTasks((prev) =>
      prev.map((evt) =>
        evt.id === info.event.id
          ? { ...evt, start: info.event.startStr, end: info.event.endStr }
          : evt
      )
    );
  };

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
              isNew: editTask.isNew === true ? false : false
            }
          : evt
      )
    );
    setIsModalOpen(false);
    setEditTask({});
  };

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { checked, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      selectedStatus: checked
        ? [...prev.selectedStatus, value]
        : prev.selectedStatus.filter((status) => status !== value),
    }));
  };

  const handleTimeFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { checked, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      selectedTime: checked
        ? [...prev.selectedTime, timeFilters[value as keyof typeof timeFilters]]
        : prev.selectedTime.filter(
            (days) => days !== timeFilters[value as keyof typeof timeFilters]
          ),
    }));
  };

  const handleSearchTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({ ...prev, searchText: e.target.value }));
  };

  const clearFilters = () => {
    setFilters({ selectedStatus: [], selectedTime: [], searchText: "" });
  };

  const renderEventContent = (eventContent: EventContentArg) => {
    const status = eventContent.event.extendedProps.taskStatus;
    const bgColor =
      statusFilters[status as keyof typeof statusFilters] ||
      eventContent.event.backgroundColor ||
      "#ccc";

    return (
      <div
        style={{
          backgroundColor: bgColor,
          color: eventContent.event.textColor || "#fff",
          padding: "2px 4px",
          borderRadius: "4px",
          fontSize: "0.8rem",
          textAlign: "center",
          fontWeight: "bold",
        }}
      >
        {eventContent.event.title}
      </div>
    );
  };

  const eventsToShow =
    filters.selectedStatus.length > 0 ||
    filters.selectedTime.length > 0 ||
    filters.searchText.length > 0
      ? filteredTasks
      : tasks;

  return (
    <div className="demo-app">
      {/* Single unified header */}
      <header style={{ marginBottom: "1rem" }}>
        <h1 style={{ marginBottom: "0.5rem" }}>Team Task Scheduler</h1>
        <div className="filter-controls" style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
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
        </div>
      </header>

      {/* Calendar */}
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        initialView="dayGridMonth"
        editable
        selectable
        selectMirror
        dayMaxEvents
        weekends={weekendsVisible}
        events={eventsToShow}
        select={handleDateSelect}
        eventContent={renderEventContent}
        eventClick={handleEventClick}
        eventResize={handleEventResize}
        eventDrop={handleEventDrop}
        eventResizableFromStart
      />

      {/* Modal */}
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
