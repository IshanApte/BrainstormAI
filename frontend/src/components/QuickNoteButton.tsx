import React, { useState } from 'react';
import { Plus, X, Save, Edit3 } from 'lucide-react';
import { notesApi } from '../services/api';

interface QuickNoteButtonProps {
  sessionId: string | null;
  onNoteCreated?: () => void;
}

const QuickNoteButton: React.FC<QuickNoteButtonProps> = ({ sessionId, onNoteCreated }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSaveNote = async () => {
    if (!sessionId || !noteContent.trim()) return;

    setIsLoading(true);
    try {
      await notesApi.createNote(sessionId, noteContent.trim());
      setNoteContent('');
      setIsOpen(false);
      onNoteCreated?.(); // Refresh notes in the main panel
    } catch (error) {
      console.error('Error creating quick note:', error);
      alert('Failed to create note. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setNoteContent('');
  };

  // Don't show if no session
  if (!sessionId) return null;

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 w-14 h-14 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-40 ${
          isOpen ? 'scale-0' : 'scale-100'
        }`}
        title="Quick Note"
      >
        <Edit3 size={20} />
      </button>

      {/* Quick Note Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Quick Note</h3>
              <button
                onClick={handleClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 p-4">
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Jot down your thoughts..."
                className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none text-sm"
                autoFocus
              />
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-4 border-t border-gray-200">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNote}
                disabled={!noteContent.trim() || isLoading}
                className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default QuickNoteButton; 