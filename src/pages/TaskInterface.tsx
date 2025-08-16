export interface Task {
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
  width: number,
  singleDayWidth: number,
}

export interface Filters {
  selectedStatus: string[];
  selectedTime: number[];
  searchText: string;
}
