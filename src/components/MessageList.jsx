import React, { useEffect, useRef } from 'react';
import './MessageList.css';

function MessageList({ messages, loading }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (loading) {
    return (
      <div className="message-list">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading messages...</p>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="message-list">
        <div className="empty-messages">
          <p>Start the conversation by asking a question</p>
        </div>
      </div>
    );
  }

  return (
    <div className="message-list">
      {messages.map((message) => (
        <div key={message.id} className={`message ${message.role}`}>
          <div className="message-avatar">
            {message.role === 'user' ? '👤' : '🤖'}
          </div>
          <div className="message-content">
            <div className="message-text">
              {message.content.split('\n').map((line, i) => (
                <React.Fragment key={i}>
                  {line.startsWith('**') && line.endsWith(':**') ? (
                    <strong>{line.slice(2, -3)}:</strong>
                  ) : (
                    line
                  )}
                  {i < message.content.split('\n').length - 1 && <br />}
                </React.Fragment>
              ))}
            </div>
            {message.sources && message.sources.length > 0 && (
              <div className="message-sources">
                <div className="sources-header">Sources:</div>
                <div className="sources-list">
                  {message.sources.slice(0, 3).map((source, index) => (
                    <div key={index} className="source-item">
                      <span className="source-number">{index + 1}</span>
                      <span className="source-name">
                        {source.title || source.id || `Document ${index + 1}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="message-time">
              {new Date(message.created_at).toLocaleTimeString()}
            </div>
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

export default MessageList;
