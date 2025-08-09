
import React, { useState, useRef, useEffect } from "react";
import {
  format,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths
} from "date-fns";
import "../App.css";

const categoryStyles = {
  "To Do": "#2d1678ff",
  "In Progress": "#ff9800",
  Review: "#9c27b0",
  Completed: "#4caf50",
};

interface Task {
  id: number;
  title: string;
  category: keyof typeof categoryStyles;
  start: Date;
  end: Date;
}

const TaskPlanner: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dragStart, setDragStart] = useState<Date | null>(null);
  const [dragEnd, setDragEnd] = useState<Date | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({ title: "", category: "To Do" });
  const [selectedRange, setSelectedRange] = useState<{ start: Date; end: Date } | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<number | null>(null);
  const [resizingTaskId, setResizingTaskId] = useState<number | null>(null);
  const [resizeEdge, setResizeEdge] = useState<"left" | "right" | null>(null);
  const [categoryFilters, setCategoryFilters] = useState<string[]>([]);
  const [timeFilter, setTimeFilter] = useState<number | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const idRef = useRef(0);

  // Load tasks from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("tasks");
    if (stored) {
      const parsed = JSON.parse(stored).map((t: Task) => ({
        ...t,
        start: new Date(t.start),
        end: new Date(t.end)
      }));
      setTasks(parsed);
    }
  }, []);

  // Save tasks to localStorage
  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }, [tasks]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const handleMouseDown = (day: Date) => {
    setDragStart(day);
    setDragEnd(day);
  };

  const handleMouseEnter = (day: Date) => {
    if (dragStart) setDragEnd(day);

    if (draggingTaskId !== null) {
      const task = tasks.find((t) => t.id === draggingTaskId);
      if (task) {
        const duration = task.end.getTime() - task.start.getTime();
        const newStart = day;
        const newEnd = new Date(newStart.getTime() + duration);
        setTasks(tasks.map((t) => t.id === task.id ? { ...t, start: newStart, end: newEnd } : t));
      }
    }
if (resizingTaskId !== null) {
  const task = tasks.find((t) => t.id === resizingTaskId);
  if (task) {
    if (resizeEdge === "left") {
      // Allow expanding/shrinking to the left
      if (day <= task.end) {
        setTasks(tasks.map((t) =>
          t.id === task.id
            ? { ...t, start: day }
            : t
        ));
      }
    } else if (resizeEdge === "right") {
      // Allow expanding/shrinking to the right
      if (day >= task.start) {
        setTasks(tasks.map((t) =>
          t.id === task.id
            ? { ...t, end: day }
            : t
        ));
      }
    }
  }
}


  };

  const handleMouseUp = () => {
    if (dragStart && dragEnd && draggingTaskId === null && resizingTaskId === null) {
      const start = dragStart < dragEnd ? dragStart : dragEnd;
      const end = dragStart > dragEnd ? dragStart : dragEnd;
      setSelectedRange({ start, end });
      setModalOpen(true);
    }
    setDragStart(null);
    setDragEnd(null);
    setDraggingTaskId(null);
    setResizingTaskId(null);
    setResizeEdge(null);
  };

  const handleSubmit = () => {
    if (!formData.title.trim()) return;

    if (editingTask) {
      setTasks(tasks.map((t) =>
        t.id === editingTask.id
          ? { ...t, title: formData.title.trim(), category: formData.category as keyof typeof categoryStyles }
          : t
      ));
    } else if (selectedRange) {
      setTasks([
        ...tasks,
        {
          id: idRef.current++,
          title: formData.title.trim(),
          category: formData.category as keyof typeof categoryStyles,
          start: selectedRange.start,
          end: selectedRange.end,
        },
      ]);
    }

    setFormData({ title: "", category: "To Do" });
    setModalOpen(false);
    setSelectedRange(null);
    setEditingTask(null);
  };

  const isBetween = (date: Date, start: Date, end: Date) =>
    date >= start && date <= end;

  const filteredTasks = tasks.filter((task) => {
    const matchesCategory = categoryFilters.length === 0 || categoryFilters.includes(task.category);
    const matchesTime = timeFilter === null || (() => {
      const taskDay = task.start.getDate();
      return timeFilter === 1 ? taskDay <= 7 : timeFilter === 2 ? taskDay <= 14 : taskDay <= 21;
    })();
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesTime && matchesSearch;
  });

  const selecting = dragStart && dragEnd ? {
    start: dragStart < dragEnd ? dragStart : dragEnd,
    end: dragStart > dragEnd ? dragStart : dragEnd,
  } : null;

  return (
    <div className="app">
      <div className="header-center">
          <div style={{textAlign:"center",marginTop:"15px"}}>Month View Task Planner</div>
      </div>
      <div className="main-content">
        {/* Sidebar */}
        <div className="sidebar fixed-sidebar">
          <h3>Filter Tasks</h3>
          <div className="filter-section">
            <div className="search-bar">
              <input
                type="text"
                placeholder="Search by task name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <strong>Categories:</strong>
            <div className="filter-options">
              {Object.keys(categoryStyles).map((cat) => (
                <label key={cat} className="filter-label">
                  <input
                    type="checkbox"
                    checked={categoryFilters.includes(cat)}
                    onChange={(e) =>
                      setCategoryFilters(e.target.checked
                        ? [...categoryFilters, cat]
                        : categoryFilters.filter((c) => c !== cat)
                      )
                    }
                  />
                  {cat}
                </label>
              ))}
            </div>
          </div>
          <div className="filter-section">
            <strong>Time Range:</strong>
            <div className="filter-options">
              {[1, 2, 3].map((week) => (
                <label key={week} className="filter-label">
                  <input
                    type="radio"
                    name="time-filter"
                    checked={timeFilter === week}
                    onChange={() => setTimeFilter(week)}
                  />
                  Within {week} week{week > 1 ? "s" : ""}
                </label>
              ))}
              <label className="filter-label">
                <input
                  type="radio"
                  name="time-filter"
                  checked={timeFilter === null}
                  onChange={() => setTimeFilter(null)}
                />
                All Time
              </label>
            </div>
          </div>
        </div>

        {/* Calendar */}
        <div className="calendar-container">
            <div style={{ textAlign: "right", marginTop: "15px",marginBottom:"20px" }}>
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>{"<"}</button>
          <span style={{ margin: "0 10px" }}>{format(currentMonth, "MMMM yyyy")}</span>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>{">"}</button>
        </div>
          <div className="calendar-header">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div className="day-cell header-cell" key={day}>{day}</div>
            ))}
          </div>
          <div className="calendar" style={{ position: "relative" }}>
            {days.map((day) => (
              <div
                 key={day.toDateString()}
  className={`day-cell 
    ${!isSameMonth(day, monthStart) ? "faded" : ""} 
    ${selecting && isBetween(day, selecting.start, selecting.end) ? "selecting" : ""} 
    ${isSameDay(day, new Date()) ? "today" : ""}  // ✅ Highlight current date
  `}
  onMouseDown={() => handleMouseDown(day)}
  onMouseEnter={() => handleMouseEnter(day)}
  onMouseUp={handleMouseUp}
              >
                <div className="date-label">{format(day, "d")}</div>

                {filteredTasks.map((task) =>
                  isBetween(day, task.start, task.end) ? (
                    <div
                      key={`${task.id}-${day.toDateString()}`}
                      className="task"
                      style={{ backgroundColor: categoryStyles[task.category] }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingTask(task);
                        setFormData({ title: task.title, category: task.category });
                        setModalOpen(true);
                      }}
                      onMouseDown={(e) => {
  e.stopPropagation();
  
  const isStart = isSameDay(day, task.start);
  const isEnd = isSameDay(day, task.end);

  if (isStart && isEnd) {
    // Single-day task — decide edge based on click position
    const cellWidth = (e.currentTarget as HTMLElement).offsetWidth;
    const clickX = e.nativeEvent.offsetX;

    if (clickX < cellWidth / 2) {
      setResizingTaskId(task.id);
      setResizeEdge("left");
    } else {
      setResizingTaskId(task.id);
      setResizeEdge("right");
    }
    setDragStart(day);
  } else if (isStart) {
    setResizingTaskId(task.id);
    setResizeEdge("left");
    setDragStart(day);
  } else if (isEnd) {
    setResizingTaskId(task.id);
    setResizeEdge("right");
    setDragStart(day);
  } else {
    setDraggingTaskId(task.id);
    setDragStart(day);
  }
}}

                    >
                      {isSameDay(day, task.start) && <div className="resize-handle left" />}
                      <span className="task-title">{task.title}</span>
                      {isSameDay(day, task.end) && <div className="resize-handle right" />}
                    </div>
                  ) : null
                )}

                {dragStart && dragEnd && (() => {
                  const start = dragStart < dragEnd ? dragStart : dragEnd;
                  const end = dragStart > dragEnd ? dragStart : dragEnd;
                  if (!isBetween(day, start, end)) return null;
                  return (
                    <div
                      key={"preview-" + day.toDateString()}
                      className="task preview-task"
                      style={{ backgroundColor: "#aaa", opacity: 0.5 }}
                    >
                      <span className="task-title">{formData.title.trim() || "New Task"}</span>
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => {
          setModalOpen(false);
          setEditingTask(null);
        }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingTask ? "Edit Task" : "Create Task"}</h2>
            <label>
              Task Name:
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                autoFocus
              />
            </label>
            <label>
              Category:
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                {Object.keys(categoryStyles).map((cat) => (
                  <option key={cat}>{cat}</option>
                ))}
              </select>
            </label>
            <div className="modal-actions">
              <button onClick={handleSubmit}>{editingTask ? "Save Changes" : "Add Task"}</button>
              <button onClick={() => {
                setModalOpen(false);
                setEditingTask(null);
              }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskPlanner;
