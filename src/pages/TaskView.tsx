import {
  addDays,
  differenceInDays,
  endOfWeek,
  isSaturday,
  isSunday,
  nextSaturday,
  startOfDay,
  startOfWeek,
  subDays,
} from "date-fns";
import interact from "interactjs";
import { useEffect, useRef } from "react";
import { statusFilters } from "./Constants";
import { toISODate } from "./DateMethods";
import type { Task } from "./TaskInterface";

interface TaskViewProps {
  task: Task;
  handleOpenModal: (task: Task) => void;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  topOffset: number;
  weekHeight: number;
  width: number;
}

const TaskView: React.FC<TaskViewProps> = ({
  task,
  handleOpenModal,
  setTasks,
  topOffset,
  width,
}) => {
  const statusColor =
    statusFilters[task.taskStatus as keyof typeof statusFilters] ||
    task.backgroundColor ||
    "#94a3b8";
  const taskRef = useRef<HTMLDivElement>(null);
  const dragOrResizeRef = useRef(false);
  // Store original dates before resize
  const dayWidthRef = useRef(0);
  const resizeStartRef = useRef<{ start: Date; end: Date } | null>(null);

  const getUpdatedWidth = (
    taskEndDate: Date,
    taskStartDate: Date,
    singleCellWidth: number
  ) => {
    
    const noOfDays = differenceInDays(taskEndDate, taskStartDate) + 1;
    return noOfDays * singleCellWidth;
  };

  function daysToSaturday(date: Date) {
    const given = startOfDay(date); // normalize time
    const saturday = startOfDay(nextSaturday(given)); // next Saturday (same week if not passed)
    return differenceInDays(saturday, given) + 1;
  }

  function daysFromSunday(date: Date) {
    const day = date.getDay(); // 0=Sun, 1=Mon, ... 6=Sat

    // Sunday is 0, so just return offset backwards
    return day + 1;
  }

  useEffect(() => {
    const taskEl = taskRef.current;
    if (!taskEl) return;

    const dayCell = taskEl.closest(".day-cell") as HTMLElement;
    if (!dayCell) return;

    dayWidthRef.current = dayCell.offsetWidth;

    interact(taskEl)
      .resizable({
        edges: { left: true, right: true },
        listeners: {
          start() {
            dragOrResizeRef.current = true;
            resizeStartRef.current = {
              start: new Date(task.start),
              end: new Date(task.end),
            };
          },
          move: function (event) {
            let { x, y } = event.target.dataset;

            x = (parseFloat(x) || 0) + event.deltaRect.left;
            y = (parseFloat(y) || 0) + event.deltaRect.top;
            //calculcate moveable width
            if (event.edges.right) {
              const noOfDays = daysToSaturday(new Date(task.start));
              if (event.rect.width > noOfDays * task.singleDayWidth) {
                return;
              }
            }

            if (event.edges.left) {
              const noOfDays = daysFromSunday(new Date(task.end));
              if (event.rect.width > noOfDays * task.singleDayWidth) {
                return;
              }
            }
            if (event.rect.width < task.singleDayWidth) {
              Object.assign(event.target.style, {
                width: `${
                  event.rect.width < task.singleDayWidth
                    ? task.singleDayWidth - 30
                    : event.rect.width
                }px`,
              });
            } else {
              Object.assign(event.target.style, {
                width: `${
                  event.rect.width < task.singleDayWidth
                    ? task.singleDayWidth - 30
                    : event.rect.width
                }px`,
                transform: `translate(${x}px, ${y}px)`,
              });
            }

            Object.assign(event.target.dataset, { x, y });
          },
          end(event) {
            
            if (resizeStartRef.current === null) {
              return;
            }

            if (event.rect.width < task.width) {
              const snappedWidth = Math.max(
                task.singleDayWidth,
                Math.ceil(event.rect.width / task.singleDayWidth) *
                  task.singleDayWidth
              );
              const daysSpanned =
                task.width / task.singleDayWidth -
                snappedWidth / task.singleDayWidth;
              setTasks((prev) =>
                prev.map((t) => {
                  if (t.id !== task.id) return t;

                  // resizing from left
                  if (event.edges.left) {
                    

                    if (daysSpanned > 0) {
                      const startdate = addDays(
                        resizeStartRef.current!.start,
                        daysSpanned
                      );

                      const updatedWidth = getUpdatedWidth(
                        new Date(task.end),
                        startdate,
                        task.singleDayWidth
                      );

                      Object.assign(event.target.style, {
                        width: `${
                          updatedWidth <= task.singleDayWidth
                            ? updatedWidth - 30
                            : updatedWidth
                        }px`,
                      });
                      return {
                        ...t,
                        start: toISODate(
                          startdate // move start left or right
                        ),
                        // update width explicitly
                        width: updatedWidth,
                      };
                    } else {
                      let startdate = addDays(
                        resizeStartRef.current!.start,
                        daysSpanned
                      );
                      if (daysSpanned === 0) {
                        startdate = new Date(task.start);
                      }
                      const endDate = resizeStartRef.current!.start;
                      const updatedWidth = getUpdatedWidth(
                        endDate,
                        startdate,
                        task.singleDayWidth
                      );
                      Object.assign(event.target.style, {
                        width: `${
                          updatedWidth <= task.singleDayWidth
                            ? updatedWidth - 30
                            : updatedWidth
                        }px`,
                      });
                      return {
                        ...t,
                        start: toISODate(
                          startdate // move start left or right
                        ),
                        end: toISODate(endDate),
                        // update width explicitly
                        width: updatedWidth,
                      };
                    }
                  }

                  // resizing from right
                  if (event.edges.right) {
                    
                    let endDate = subDays(
                      resizeStartRef.current!.end,
                      daysSpanned
                    );

                    if (daysSpanned === 0) {
                      endDate = new Date(task.start);
                    }

                    const updatedWidth = getUpdatedWidth(
                      endDate,
                      new Date(task.start),
                      task.singleDayWidth
                    );
                    Object.assign(event.target.style, {
                      width: `${
                        updatedWidth <= task.singleDayWidth
                          ? updatedWidth - 30
                          : updatedWidth
                      }px`,
                    });
                    return {
                      ...t,
                      end: toISODate(endDate),
                      width: updatedWidth,
                    };
                  }

                  return t;
                })
              );
            } else {
              
              if (event.edges.left && isSunday(new Date(task.start))) return;
              if (event.edges.right && isSaturday(new Date(task.end))) return;
              const snappedWidth =
                Math.ceil((event.rect.width - 20) / task.singleDayWidth) *
                task.singleDayWidth;
              const daysSpanned =
                snappedWidth / task.singleDayWidth -
                task.width / task.singleDayWidth;
              const weekStartDate = startOfWeek(new Date(task.start));
              const weekEndDate = endOfWeek(new Date(task.start));
              // const dayWidth = task.width;
              // const daysSpanned = Math.max(1, Math.ceil(event.rect.width / dayWidth));
              setTasks((prev) =>
                prev.map((t) => {
                  if (t.id !== task.id) return t;

                  // resizing from left
                  if (event.edges.left) {
                    
                    let startDate = subDays(
                      resizeStartRef.current!.start,
                      daysSpanned
                    );
                    if (startDate < weekStartDate) {
                      startDate = weekStartDate;
                    }
                    const updatedWidth = getUpdatedWidth(
                      new Date(task.end),
                      startDate,
                      task.singleDayWidth
                    );
                    Object.assign(event.target.style, {
                      width: `${
                        updatedWidth <= task.singleDayWidth
                          ? updatedWidth - 30
                          : updatedWidth
                      }px`,
                    });
                    return {
                      ...t,
                      start: toISODate(
                        startDate // move start left or right
                      ),
                      // update width explicitly
                      width: updatedWidth,
                    };
                  }

                  // resizing from right
                  if (event.edges.right) {
                    

                    let endDate = addDays(
                      resizeStartRef.current!.end,
                      daysSpanned
                    );
                    if (endDate > weekEndDate) {
                      endDate = weekEndDate;
                    }
                    const updatedWidth = getUpdatedWidth(
                      endDate,
                      new Date(task.start),
                      task.singleDayWidth
                    );

                    Object.assign(event.target.style, {
                      width: `${
                        updatedWidth <= task.singleDayWidth
                          ? updatedWidth - 30
                          : updatedWidth
                      }px`,
                    });
                    // const noOfDays =
                    //   differenceInDays(endDate, new Date(task.start)) + 1;
                    return {
                      ...t,
                      end: toISODate(endDate),
                      width: updatedWidth,
                    };
                  }

                  return t;
                })
              );
            }

            dragOrResizeRef.current = false;
            // resizeStartRef.current = null;
          },
        },
      })

      .draggable({
        listeners: {
          move(event) {
            
            const currentX = parseFloat(taskEl.dataset["x"] || "0");
            const currentY = parseFloat(taskEl.dataset["y"] || "0");

            const newX = currentX + event.dx;
            const newY = currentY + event.dy;

            taskEl.dataset["x"] = newX.toString();
            taskEl.dataset["y"] = newY.toString();

            Object.assign(taskEl.style, {
              transform: `translate(${newX}px, ${newY}px)`,
            });
          },
          end() {
            const totalX = parseFloat(taskEl.dataset["x"] || "0");
            const totalY = parseFloat(taskEl.dataset["y"] || "0");
            const noOfDays =
              differenceInDays(new Date(task.end), new Date(task.start)) + 1;
            const dayWidth = task.width / noOfDays; // horizontal grid size
            const rowHeight = 120; // vertical grid size

            // Calculate how many columns/days moved
            const deltaDays =
              totalX >= 0
                ? Math.floor(totalX / dayWidth)
                : Math.ceil(totalX / dayWidth);

            // Calculate how many rows moved
            const deltaRows =
              totalY >= 0
                ? Math.floor(totalY / rowHeight)
                : Math.ceil(totalY / rowHeight);

            // Update task start/end dates based on movement
            setTasks((prev) =>
              prev.map((t) => {
                if (t.id !== task.id) return t;
                return {
                  ...t,
                  start: toISODate(
                    addDays(new Date(t.start), deltaDays + deltaRows * 7)
                  ),
                  end: toISODate(
                    addDays(new Date(t.end), deltaDays + deltaRows * 7)
                  ),
                };
              })
            );

            // Reset transform and dataset for next drag
            taskEl.style.transform = "none";
            taskEl.dataset["x"] = "0";
            taskEl.dataset["y"] = "0";
          },
        },
      });
  }, [task]);

  return (
    <div
      ref={taskRef}
      className="task-view"
      onClick={(e) => {
        if (!dragOrResizeRef.current) {
          e.stopPropagation();
          handleOpenModal(task);
        }
      }}
      style={{
        background: statusColor,
        border: `1px solid ${statusColor || "transparent"}`,
        color: task.textColor || "#0f172a",
        padding: "4px 6px",
        borderRadius: 6,
        fontSize: 12,
        width: `${width}px`,
        boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
        userSelect: "none",
        cursor: "pointer !important",
        position: "absolute",
        zIndex: 10,
        top: topOffset,
      }}
    >
      <span
        style={{
          flex: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          cursor: "pointer",
        }}
      >
        {task.title || task.taskName}
      </span>
    </div>
  );
};

export default TaskView;
