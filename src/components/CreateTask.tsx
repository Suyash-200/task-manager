import React from "react";
import "./CreateTask.css";

interface TaskDetails {
  id?: string;
  title?: string;
  taskName?: string;
  taskStatus?: string;
  start?: string;
  end?: string;
  display?: string;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  isNew?: boolean
}

interface CreateTaskProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  taskDetails: TaskDetails;
  setTaskDetails: (details: TaskDetails) => void;
}

const CreateTask: React.FC<CreateTaskProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  taskDetails, 
  setTaskDetails 
}) => {
  if (!isOpen) return null;

  const handleSave = () => {
    if (!taskDetails.taskName || !taskDetails.taskStatus) return;
    onSave();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTaskDetails({ ...taskDetails, [name]: value });
  };
  console.log(taskDetails);
  

  return (
    <div className="swal-overlay">
      <div className="swal-container">
        <h2 className="swal-title">
          { taskDetails.isNew  ? "Create Task" : "Edit Task"}
        </h2>

        <input
          className="swal-input"
          placeholder="Enter task name"
          name="taskName"
          value={taskDetails.taskName || ""}
          onChange={handleChange}
        />

        <select
          className="swal-select"
          value={taskDetails.taskStatus || ""}
          name="taskStatus"
          onChange={handleChange}
        >
          <option value="">Select status</option>
          <option value="To Do">To Do</option>
          <option value="In Progress">In Progress</option>
          <option value="Review">Review</option>
          <option value="Completed">Completed</option>
        </select>

        <div className="swal-buttons">
          <button className="swal-btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            className="swal-btn-confirm"
            onClick={handleSave}
            disabled={!taskDetails.taskName || !taskDetails.taskStatus}
          >
            {taskDetails.isNew ? "Save" : "Update"} Task
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateTask;