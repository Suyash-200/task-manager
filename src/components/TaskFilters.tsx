import React from "react";

interface TaskFiltersProps {
  options: Record<string, string | number>;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  selectedValues: Array<string | number>;
}

const TaskFilters: React.FC<TaskFiltersProps> = ({ 
  options, 
  handleChange, 
  selectedValues 
}) => {
  return (
    <div className="filter-group">
      {Object.entries(options).map(([label, value]) => {
        const isChecked = selectedValues.includes(label) || selectedValues.includes(value);

        return (
          <label key={label} className="filter-label">
            <input
              type="checkbox"
              checked={isChecked}
              value={label}
              onChange={handleChange}
              className="filter-checkbox"
            />
            <span className="filter-text">{label}</span>
          </label>
        );
      })}
    </div>
  );
};

export default TaskFilters;