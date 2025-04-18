import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import styles from './EmployeeTasks.module.css';

const EmployeeTasks = ({ token, employee }) => {
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [comment, setComment] = useState('');
  const [filter, setFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(
          `https://trackzone-backend.onrender.com/api/employee/dashboard/${employee.employeeId}/tasks`, 
          {
            headers: { 'Authorization': `Bearer ${token}` }
          }
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch tasks');
        }
        
        const data = await response.json();
        setTasks(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching tasks:', err);
        setError('Failed to load tasks. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTasks();
  }, [employee.employeeId, token]);

  const fetchTaskDetails = async (taskId) => {
    try {
      const response = await fetch(`https://trackzone-backend.onrender.com/api/employee/tasks/${taskId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch task details');
      }
      
      const data = await response.json();
      setSelectedTask(data);
    } catch (err) {
      console.error('Error fetching task details:', err);
      setError('Failed to load task details. Please try again later.');
    }
  };

  const updateTaskStatus = async (taskId, status) => {
    try {
      const response = await fetch(`https://trackzone-backend.onrender.com/api/employee/tasks/${taskId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update task status');
      }
      
      const updatedTask = await response.json();
      
      // Update tasks list
      setTasks(tasks.map(task => 
        task._id === taskId ? { ...task, status: updatedTask.status } : task
      ));
      
      // Update selected task if open
      if (selectedTask && selectedTask._id === taskId) {
        setSelectedTask({ ...selectedTask, status: updatedTask.status });
      }
    } catch (err) {
      console.error('Error updating task status:', err);
      setError('Failed to update task status. Please try again later.');
    }
  };

  const addComment = async (taskId) => {
    if (!comment.trim()) return;
    
    try {
      const response = await fetch(`https://trackzone-backend.onrender.com/api/employee/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          text: comment,
          postedBy: employee.employeeId,
          userModel: 'Employee'
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to add comment');
      }
      
      const updatedTask = await response.json();
      setSelectedTask(updatedTask);
      setComment('');
      
      // Refresh task details to show the new comment
      fetchTaskDetails(taskId);
    } catch (err) {
      console.error('Error adding comment:', err);
      setError('Failed to add comment. Please try again later.');
    }
  };

  const getFilteredTasks = () => {
    if (filter === 'all') return tasks;
    return tasks.filter(task => task.status.toLowerCase() === filter.toLowerCase());
  };

  const getPriorityColor = (priority) => {
    switch(priority?.toLowerCase()) {
      case 'high': return styles.priorityHigh;
      case 'medium': return styles.priorityMedium;
      case 'low': return styles.priorityLow;
      default: return styles.priorityMedium;
    }
  };

  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'completed': return styles.statusCompleted;
      case 'partially completed': return styles.statusPartial;
      case 'pending': return styles.statusPending;
      case 'to do': return styles.statusTodo;
      default: return styles.statusPending;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No deadline';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1, 
      transition: { 
        when: "beforeChildren", 
        staggerChildren: 0.1 
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1, 
      transition: { type: 'spring', stiffness: 100 }
    }
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  };

  const modalVariants = {
    hidden: { y: 50, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1, 
      transition: { type: 'spring', damping: 25, stiffness: 300 }
    },
    exit: { y: 50, opacity: 0 }
  };

  return (
    <div className={styles.tasksContainer}>
      <motion.div 
        className={styles.tasksHeader}
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <h1>My Tasks & Projects</h1>
        <div className={styles.filterContainer}>
          <button 
            className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button 
            className={`${styles.filterBtn} ${filter === 'pending' ? styles.active : ''}`}
            onClick={() => setFilter('pending')}
          >
            Pending
          </button>
          <button 
            className={`${styles.filterBtn} ${filter === 'partially completed' ? styles.active : ''}`}
            onClick={() => setFilter('partially completed')}
          >
            In Progress
          </button>
          <button 
            className={`${styles.filterBtn} ${filter === 'completed' ? styles.active : ''}`}
            onClick={() => setFilter('completed')}
          >
            Completed
          </button>
        </div>
      </motion.div>

      {isLoading ? (
        <div className={styles.loaderContainer}>
          <motion.div 
            className={styles.loader}
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p>Loading tasks...</p>
        </div>
      ) : error ? (
        <motion.div 
          className={styles.errorMessage}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </motion.div>
      ) : tasks.length === 0 ? (
        <motion.div 
          className={styles.emptyState}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <svg width="120" height="120" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 9H9.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M15 9H15.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M8 14H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h3>No tasks assigned</h3>
          <p>You don't have any tasks assigned yet.</p>
        </motion.div>
      ) : (
        <motion.div 
          className={styles.tasksGrid}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {getFilteredTasks().map((task) => (
            <motion.div 
              key={task._id} 
              className={styles.taskCard}
              variants={itemVariants}
              whileHover={{ y: -5, boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}
              onClick={() => fetchTaskDetails(task._id)}
            >
              <div className={styles.taskCardHeader}>
                <span className={`${styles.taskPriority} ${getPriorityColor(task.priority)}`}>
                  {task.priority || 'Medium'}
                </span>
                <span className={`${styles.taskStatus} ${getStatusColor(task.status)}`}>
                  {task.status}
                </span>
              </div>
              <h3 className={styles.taskTitle}>{task.title}</h3>
              <p className={styles.taskDescription}>
                {task.description?.length > 100 
                  ? `${task.description.substring(0, 100)}...` 
                  : task.description || 'No description available'}
              </p>
              <div className={styles.taskMeta}>
                <div className={styles.taskDeadline}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  <span>{formatDate(task.dueDate)}</span>
                </div>
              </div>
              <motion.button 
                className={styles.viewDetailsBtn}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                View Details
              </motion.button>
            </motion.div>
          ))}
        </motion.div>
      )}

      <AnimatePresence>
        {selectedTask && (
          <>
            <motion.div 
              className={styles.modalBackdrop}
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              onClick={() => setSelectedTask(null)}
            />
            <motion.div 
              className={styles.taskModal}
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <div className={styles.taskModalHeader}>
                <div>
                  <span className={`${styles.taskPriority} ${getPriorityColor(selectedTask.priority)}`}>
                    {selectedTask.priority || 'Medium'}
                  </span>
                  <h2>{selectedTask.title}</h2>
                </div>
                <button 
                  className={styles.closeModalBtn}
                  onClick={() => setSelectedTask(null)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>

              <div className={styles.taskModalContent}>
                <div className={styles.taskDetailsSection}>
                  <div className={styles.taskDetailItem}>
                    <h4>Description</h4>
                    <p>{selectedTask.description || 'No description provided'}</p>
                  </div>

                  <div className={styles.taskMetaGrid}>
                    <div className={styles.taskDetailItem}>
                      <h4>Status</h4>
                      <span className={`${styles.statusBadge} ${getStatusColor(selectedTask.status)}`}>
                        {selectedTask.status}
                      </span>
                    </div>
                    <div className={styles.taskDetailItem}>
                      <h4>Due Date</h4>
                      <p>{formatDate(selectedTask.dueDate)}</p>
                    </div>
                    <div className={styles.taskDetailItem}>
                      <h4>Assigned On</h4>
                      <p>{formatDate(selectedTask.createdAt)}</p>
                    </div>
                  </div>

                  <div className={styles.taskStatusUpdate}>
                    <h4>Update Status</h4>
                    <div className={styles.statusButtonGroup}>
                      <motion.button 
                        className={`${styles.statusBtn} ${selectedTask.status === 'Pending' ? styles.active : ''}`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => updateTaskStatus(selectedTask._id, 'Pending')}
                      >
                        Pending
                      </motion.button>
                      <motion.button 
                        className={`${styles.statusBtn} ${selectedTask.status === 'Partially Completed' ? styles.active : ''}`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => updateTaskStatus(selectedTask._id, 'Partially Completed')}
                      >
                        In Progress
                      </motion.button>
                      <motion.button 
                        className={`${styles.statusBtn} ${selectedTask.status === 'Completed' ? styles.active : ''}`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => updateTaskStatus(selectedTask._id, 'Completed')}
                      >
                        Completed
                      </motion.button>
                    </div>
                  </div>
                </div>

                <div className={styles.taskCommentsSection}>
                  <h4>Comments</h4>
                  <div className={styles.commentsContainer}>
                    {selectedTask.comments && selectedTask.comments.length > 0 ? (
                      <div className={styles.commentsList}>
                        {selectedTask.comments.map((comment, index) => (
                          <motion.div 
                            key={index} 
                            className={`${styles.commentItem} ${comment.userModel === 'Employee' && comment.postedBy === employee.employeeId ? styles.ownComment : ''}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <div className={styles.commentHeader}>
                              <div className={styles.commentAuthor}>
                                <div className={styles.commentAvatar}>
                                  {comment.userModel === 'Admin' ? 'A' : 'E'}
                                </div>
                                <span>{comment.userModel === 'Admin' ? 'Admin' : 'You'}</span>
                              </div>
                              <span className={styles.commentTime}>
                                {formatDate(comment.createdAt)}
                              </span>
                            </div>
                            <p className={styles.commentText}>{comment.text}</p>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className={styles.noComments}>
                        <p>No comments yet</p>
                      </div>
                    )}
                  </div>

                  <div className={styles.addCommentForm}>
                    <textarea 
                      className={styles.commentInput}
                      placeholder="Add your comment..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                    <motion.button 
                      className={styles.addCommentBtn}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => addComment(selectedTask._id)}
                      disabled={!comment.trim()}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                      </svg>
                      Send
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EmployeeTasks;