import React from 'react';
import './ThreadList.css';

function ThreadList({ threads, currentThread, onSelectThread, onNewThread, onDeleteThread, loading }) {
  if (loading) {
    return (
      <aside className="thread-list">
        <div className="thread-list-header">
          <h2>Conversations</h2>
          <button onClick={onNewThread} className="new-thread-btn">+ New</button>
        </div>
        <div className="loading">Loading...</div>
      </aside>
    );
  }

  return (
    <aside className="thread-list">
      <div className="thread-list-header">
        <h2>Conversations</h2>
        <button onClick={onNewThread} className="new-thread-btn">+ New</button>
      </div>
      <div className="threads">
        {threads.length === 0 ? (
          <div className="empty-state">
            <p>No conversations yet</p>
            <p className="hint">Click "+ New" to start</p>
          </div>
        ) : (
          threads.map(thread => (
            <div
              key={thread.id}
              className={`thread-item ${currentThread?.id === thread.id ? 'active' : ''}`}
              onClick={() => onSelectThread(thread)}
            >
              <div className="thread-content">
                <h3>{thread.title}</h3>
                <p className="thread-date">
                  {new Date(thread.updated_at).toLocaleDateString()}
                </p>
              </div>
              <button
                className="delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('Delete this conversation?')) {
                    onDeleteThread(thread.id);
                  }
                }}
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

export default ThreadList;
