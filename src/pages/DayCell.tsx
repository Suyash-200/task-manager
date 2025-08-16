import { format, isSameDay } from "date-fns";
import type { Task } from "./TaskInterface";
import TaskView from "./TaskView";

interface DayCellProps {
  isCurrentMonth: boolean;
  onDayClick: (
    iso: string,
    setTasks: React.Dispatch<React.SetStateAction<Task[]>>,
    cellWidth: number
  ) => void;
  dayISO: string;
  dayDate: Date;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  tasks: Task[];
  handleOpenModal: (task: Task) => void;
  weekHeight: number
}

const DayCell: React.FC<DayCellProps> = ({
  isCurrentMonth,
  onDayClick,
  dayISO,
  dayDate,
  setTasks,
  tasks,
  handleOpenModal,weekHeight
}) => {
  const taskHeight = 18;

  const sameDayTasks = tasks
          .filter((t) => isSameDay(dayDate, new Date(t.start))) 

  if(tasks.length > 0){
  console.log("tasks", dayISO,tasks)

  }

  return (
    <div
      key={dayISO}
      data-date={dayISO}
      className="day-cell"
      style={{
        border: "1px solid #e5e7eb",
        background: isCurrentMonth ? "#fff" : "#f8fafc",
        color: isCurrentMonth ? "black" : "grey",
        padding: 6,
        borderRadius: 6,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start", // corrected
        cursor: "pointer",
      }}
      onClick={(e) => {
        const target = e.currentTarget as HTMLDivElement;
        const cellWidth = target.offsetWidth; // width of this day cell
        onDayClick(dayISO, setTasks, cellWidth);
      }}
    >
      <div style={{ fontWeight: 600, height: "10px" }}>
        {format(dayDate, "d")}
      </div>

      <div
        style={{
          fontSize: 12,
          display: "flex",
          flexDirection: "column",
          gap: taskHeight,
        }}
      >
        {sameDayTasks
          
          .map((t, index) => {
            const offSet = (index + 1 + (tasks.length - sameDayTasks.length)) * (taskHeight + 15)
            return (
            <TaskView
              key={t.id}
              task={t}
              handleOpenModal={handleOpenModal}
              setTasks={setTasks}
              width={isSameDay(new Date(t.end), new Date(t.start)) ? t.width - 30 : t.width - 20}
              topOffset={offSet}
              weekHeight={weekHeight}
            ></TaskView>
            )
          }
           
          )}
      </div>
    </div>
  );
};

export default DayCell;
