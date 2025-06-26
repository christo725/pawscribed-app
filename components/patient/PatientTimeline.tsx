import React from 'react';
import { useRouter } from 'next/router';

interface Note {
  id: number;
  title: string;
  note_type: string;
  status: string;
  created_at: string;
  updated_at: string;
  exported_at?: string;
}

interface Visit {
  id: number;
  visit_type: string;
  chief_complaint: string;
  created_at: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
}

interface TimelineEvent {
  id: string;
  type: 'note' | 'visit' | 'export' | 'update';
  title: string;
  description: string;
  date: Date;
  icon: string;
  color: string;
  data: Note | Visit;
}

interface PatientTimelineProps {
  notes: Note[];
  visits: Visit[];
}

export const PatientTimeline: React.FC<PatientTimelineProps> = ({ notes, visits }) => {
  const router = useRouter();

  // Create timeline events from notes and visits
  const createTimelineEvents = (): TimelineEvent[] => {
    const events: TimelineEvent[] = [];

    // Add note creation events
    notes.forEach(note => {
      events.push({
        id: `note-${note.id}`,
        type: 'note',
        title: note.title,
        description: `Created ${note.note_type.replace('_', ' ')} note`,
        date: new Date(note.created_at),
        icon: '📝',
        color: 'blue',
        data: note
      });

      // Add export events
      if (note.exported_at) {
        events.push({
          id: `export-${note.id}`,
          type: 'export',
          title: 'Note Exported',
          description: `${note.title} was exported`,
          date: new Date(note.exported_at),
          icon: '📤',
          color: 'green',
          data: note
        });
      }

      // Add significant update events
      if (note.updated_at !== note.created_at) {
        const updateDate = new Date(note.updated_at);
        const createDate = new Date(note.created_at);
        const timeDiff = updateDate.getTime() - createDate.getTime();
        
        // Only show updates that are at least 1 hour after creation
        if (timeDiff > 3600000) {
          events.push({
            id: `update-${note.id}`,
            type: 'update',
            title: 'Note Updated',
            description: `${note.title} was updated`,
            date: updateDate,
            icon: '✏️',
            color: 'yellow',
            data: note
          });
        }
      }
    });

    // Add visit events
    visits.forEach(visit => {
      events.push({
        id: `visit-${visit.id}`,
        type: 'visit',
        title: visit.chief_complaint,
        description: `${visit.visit_type} visit`,
        date: new Date(visit.created_at),
        icon: '🏥',
        color: 'purple',
        data: visit
      });
    });

    // Sort events by date (newest first)
    return events.sort((a, b) => b.date.getTime() - a.date.getTime());
  };

  const timelineEvents = createTimelineEvents();

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      return `Today at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffInDays === 1) {
      return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else if (diffInDays < 30) {
      const weeks = Math.floor(diffInDays / 7);
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } else if (diffInDays < 365) {
      const months = Math.floor(diffInDays / 30);
      return `${months} month${months > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  const getEventColor = (color: string) => {
    switch (color) {
      case 'blue':
        return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'green':
        return 'bg-green-100 border-green-300 text-green-800';
      case 'yellow':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'purple':
        return 'bg-purple-100 border-purple-300 text-purple-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const handleEventClick = (event: TimelineEvent) => {
    if (event.type === 'note' || event.type === 'export' || event.type === 'update') {
      router.push(`/notes/${(event.data as Note).id}`);
    } else if (event.type === 'visit') {
      router.push(`/visits/${(event.data as Visit).id}`);
    }
  };

  if (timelineEvents.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Timeline Events</h3>
        <p className="text-gray-600">Events will appear here as you add notes and visits.</p>
      </div>
    );
  }

  // Group events by date
  const groupedEvents: { [key: string]: TimelineEvent[] } = {};
  timelineEvents.forEach(event => {
    const dateKey = event.date.toDateString();
    if (!groupedEvents[dateKey]) {
      groupedEvents[dateKey] = [];
    }
    groupedEvents[dateKey].push(event);
  });

  return (
    <div className="space-y-8">
      {Object.entries(groupedEvents).map(([dateKey, events]) => (
        <div key={dateKey}>
          <div className="sticky top-0 bg-white z-10 pb-2">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              {new Date(dateKey).toLocaleDateString('en-US', { 
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </h3>
          </div>
          
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>
            
            {/* Timeline events */}
            <div className="space-y-4">
              {events.map((event, index) => (
                <div key={event.id} className="relative flex items-start">
                  {/* Timeline dot */}
                  <div className="absolute left-8 w-0.5 h-full bg-gray-200 -translate-x-1/2">
                    <div className={`w-4 h-4 rounded-full border-2 border-white ${
                      event.color === 'blue' ? 'bg-blue-500' :
                      event.color === 'green' ? 'bg-green-500' :
                      event.color === 'yellow' ? 'bg-yellow-500' :
                      event.color === 'purple' ? 'bg-purple-500' :
                      'bg-gray-500'
                    }`}></div>
                  </div>
                  
                  {/* Event content */}
                  <div className="ml-16 flex-1">
                    <div
                      className={`p-4 rounded-lg border cursor-pointer hover:shadow-md transition-shadow ${getEventColor(event.color)}`}
                      onClick={() => handleEventClick(event)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <span className="text-2xl">{event.icon}</span>
                          <div>
                            <h4 className="font-medium">{event.title}</h4>
                            <p className="text-sm opacity-80">{event.description}</p>
                            <p className="text-xs mt-1 opacity-60">
                              {formatDate(event.date)}
                            </p>
                          </div>
                        </div>
                        <svg className="w-5 h-5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};