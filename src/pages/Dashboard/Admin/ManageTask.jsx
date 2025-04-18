import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ManageTask.css'; // Assuming you have a CSS file for styling

const ManageTask = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    employeeId: '',
    priority: 'Medium',
    dueDate: '',
    status: 'Pending'
  });

  // Fetch tasks and employees on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const [tasksResponse, employeesResponse] = await Promise.all([
          axios.get('https://trackzone-backend.onrender.com/api/admin/tasks'),
          axios.get('https://trackzone-backend.onrender.com/api/admin/employees')
        ]);
        
        setTasks(tasksResponse.data);
        setEmployees(employeesResponse.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data. Please try again.');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTaskForm({
      ...taskForm,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Convert dueDate to ISO format
      const payload = {
        ...taskForm,
        dueDate: taskForm.dueDate ? new Date(taskForm.dueDate).toISOString() : ''
      };
      
      console.log('Sending payload:', payload); // Debug log
      
      let response;
      
      if (selectedTask) {
        // Update existing task
        response = await axios.put(
          `https://trackzone-backend.onrender.com/api/admin/tasks/${selectedTask._id}`,
          payload
        );
        
        setTasks(tasks.map(task => 
          task._id === selectedTask._id ? response.data : task
        ));
      } else {
        // Create new task
        response = await axios.post(
          'https://trackzone-backend.onrender.com/api/admin/tasks',
          payload
        );
        
        setTasks([...tasks, response.data]);
      }
      
      // Reset form and close modal
      setTaskForm({
        title: '',
        description: '',
        employeeId: '',
        priority: 'Medium',
        dueDate: '',
        status: 'Pending'
      });
      setSelectedTask(null);
      setShowModal(false);
      
    } catch (err) {
      console.error(selectedTask ? 'Update error:' : 'Creation error:', err.response?.data || err.message);
      setError(selectedTask ? 'Failed to update task' : 'Failed to create task');
    }
  };

  const handleDeleteTask = async (id) => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }
    
    try {
      await axios.delete(
        `https://trackzone-backend.onrender.com/api/admin/tasks/${id}`
      );
      
      setTasks(tasks.filter(task => task._id !== id));
      
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete task');
    }
  };

  const handleEditTask = (task) => {
    setSelectedTask(task);
    setTaskForm({
      title: task.title || '',
      description: task.description || '',
      employeeId: task.employeeId || '', // Use the string employeeId
      priority: task.priority || 'Medium',
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
      status: task.status || 'Pending'
    });
    setShowModal(true);
  };

  const handleOpenModal = () => {
    setSelectedTask(null);
    setTaskForm({
      title: '',
      description: '',
      employeeId: '',
      priority: 'Medium',
      dueDate: '',
      status: 'Pending'
    });
    setShowModal(true);
  };

  const filteredTasks = tasks.filter(task => {
    // Filter by status
    if (filterStatus !== 'all' && task.status?.toLowerCase() !== filterStatus.toLowerCase()) {
      return false;
    }
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        task.title?.toLowerCase().includes(term) ||
        task.description?.toLowerCase().includes(term)
      );
    }
    
    return true;
  });

  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const getDaysUntil = (dateString) => {
    if (!dateString) return '';
    
    const today = new Date();
    const dueDate = new Date(dateString);
    
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return '1 day left';
    return `${diffDays} days left`;
  };

  const getEmployeeName = (employeeId) => {
    const employee = employees.find(emp => emp.employeeId === employeeId);
    return employee ? employee.name : 'Unknown';
  };

  if (loading) {
    return <div className="loading">Loading tasks...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">
          <h3>Error</h3>
          <p>{error}</p>
          <button onClick={() => {
            setError(null);
            window.location.reload();
          }}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="task-manager">
      <div className="task-header">
        <h2>Task Management</h2>
        <button className="create-btn" onClick={handleOpenModal}>
          + Create Task
        </button>
      </div>
      
      <div className="task-filters">
        <div className="filter-group">
          <button 
            className={filterStatus === 'all' ? 'active' : ''}
            onClick={() => setFilterStatus('all')}
          >
            All
          </button>
          <button 
            className={filterStatus === 'pending' ? 'active' : ''}
            onClick={() => setFilterStatus('pending')}
          >
            Pending
          </button>
          <button 
            className={filterStatus === 'in progress' ? 'active' : ''}
            onClick={() => setFilterStatus('in progress')}
          >
            In Progress
          </button>
          <button 
            className={filterStatus === 'completed' ? 'active' : ''}
            onClick={() => setFilterStatus('completed')}
          >
            Completed
          </button>
        </div>
        
        <div className="search-box">
          <input 
            type="text" 
            placeholder="Search tasks..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      {filteredTasks.length === 0 ? (
        <div className="no-tasks">
          <p>No tasks found. {filterStatus !== 'all' ? 'Try changing filters or ' : ''}Create a new task to get started.</p>
        </div>
      ) : (
        <div className="task-list">
          {filteredTasks.map(task => (
            <div key={task._id} className={`task-card ${task.status?.toLowerCase()}`}>
              <div className="task-header">
                <h3>{task.title}</h3>
                <span className={`priority ${task.priority?.toLowerCase()}`}>
                  {task.priority}
                </span>
              </div>
              
              <p className="task-description">
                {task.description?.length > 100
                  ? `${task.description.substring(0, 100)}...` 
                  : task.description}
              </p>
              
              <div className="task-meta">
                <div className="assigned-to">
                  <span>Assigned to: </span>
                  {getEmployeeName(task.employeeId)}
                </div>
                
                <div className="task-date">
                  <div>{formatDate(task.dueDate)}</div>
                  <div className={`days-left ${getDaysUntil(task.dueDate) === 'Overdue' ? 'overdue' : ''}`}>
                    {getDaysUntil(task.dueDate)}
                  </div>
                </div>
              </div>
              
              <div className="task-footer">
                <div className={`status-badge ${task.status?.toLowerCase()}`}>
                  {task.status}
                </div>
                
                <div className="task-actions">
                  <button 
                    className="edit-btn"
                    onClick={() => handleEditTask(task)}
                  >
                    Edit
                  </button>
                  <button 
                    className="delete-btn"
                    onClick={() => handleDeleteTask(task._id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {showModal && (
        <div className="modal-overlay">
          <div className="task-modal">
            <div className="modal-header">
              <h3>{selectedTask ? 'Edit Task' : 'Create New Task'}</h3>
              <button 
                className="close-btn" 
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Title</label>
                <input 
                  type="text" 
                  name="title"
                  value={taskForm.title}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Description</label>
                <textarea 
                  name="description"
                  value={taskForm.description}
                  onChange={handleInputChange}
                  required
                ></textarea>
              </div>
              
              <div className="form-group">
                <label>Assign to</label>
                <select 
                  name="employeeId"
                  value={taskForm.employeeId}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select Employee</option>
                  {employees.map(employee => (
                    <option key={employee._id} value={employee.employeeId}>
                      {employee.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Priority</label>
                  <select 
                    name="priority"
                    value={taskForm.priority}
                    onChange={handleInputChange}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Due Date</label>
                  <input 
                    type="date" 
                    name="dueDate"
                    value={taskForm.dueDate}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              
              {selectedTask && (
                <div className="form-group">
                  <label>Status</label>
                  <select 
                    name="status"
                    value={taskForm.status}
                    onChange={handleInputChange}
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              )}
              
              <div className="form-actions">
                <button 
                  type="button" 
                  className="cancel-btn"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="submit-btn"
                >
                  {selectedTask ? 'Update Task' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageTask;