import { parseISO } from "date-fns";
import type { Task } from "./TaskInterface";

const computeTasksOnDay = (all: Task[], dayISO: string): Task[] => {
  const d = parseISO(dayISO);
  
  return all.filter((t) => {
    const s = parseISO(t.start);
    const e = parseISO(t.end || t.start);
    return d >= s && d <= e;
  });
};

export const tasksOnDay = (eventsToShow: Task[], dayISO: string): Task[] => {
  const list = computeTasksOnDay(eventsToShow, dayISO);
  return list;

};

export const createNewTaskOnDay = (
  dayISO: string,
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>,
  cellWidth: number
) => {
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
    width: cellWidth,
    singleDayWidth: cellWidth
  };
  setTasks((prev) => [...prev, newTask]);
};

export const handleSaveTask = (
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>,
  editTask: Partial<Task>,
  handleResetModal: () => void
) => {
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
  handleResetModal();
};
