import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { 
  RefreshCw, 
  Users, 
  FileText,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { db } from '@/lib/firebase';
import { collection, query, where, addDoc, onSnapshot, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { logActivity } from '@/lib/activity';
import { startOfWeek, addDays, format, isSameDay, startOfMonth, isSameMonth, addWeeks, addMonths } from 'date-fns';
import { toast } from 'sonner';


const TIMES = ['07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00'];

const EVENT_COLORS = [
  { bg: 'bg-[#EAE8E3]', text: 'text-gray-900', icon: 'text-pink-500 bg-pink-100' },
  { bg: 'bg-[#FDE047]', text: 'text-yellow-900', icon: 'text-yellow-700 bg-yellow-200' },
  { bg: 'bg-[#BFDBFE]', text: 'text-blue-900', icon: 'text-blue-700 bg-blue-300' },
  { bg: 'bg-white border border-black/5', text: 'text-gray-900', icon: 'text-purple-500 bg-purple-100' }
];

export const Schedule: React.FC = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    timeStart: '08:00',
    timeEnd: '09:00',
    location: '',
    themeId: 0
  });

  const [view, setView] = useState<'today' | 'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Calculate dynamic week days
  let visibleDays: any[] = [];
  let monthDays: any[] = [];
  
  const startOfCurrentWeek = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday

  if (view === 'today') {
    visibleDays = [{
      dateObj: currentDate,
      short: `W ${format(currentDate, 'I')}`,
      name: format(currentDate, 'EEEE').toUpperCase(),
      date: format(currentDate, 'dd/MM'),
      fullDate: format(currentDate, 'yyyy-MM-dd'),
      active: isSameDay(currentDate, new Date()),
      textLight: false
    }];
  } else if (view === 'week') {
    visibleDays = Array.from({ length: 7 }).map((_, i) => {
      const d = addDays(startOfCurrentWeek, i);
      return {
        dateObj: d,
        short: i === 0 ? `W ${format(d, 'I')}` : '',
        name: format(d, 'EEEE').toUpperCase(),
        date: format(d, 'dd/MM'),
        fullDate: format(d, 'yyyy-MM-dd'),
        active: isSameDay(d, new Date()),
        textLight: i >= 5
      };
    });
  } else if (view === 'month') {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const totalDays = 42; // 6 weeks
    monthDays = Array.from({ length: totalDays }).map((_, i) => {
      const d = addDays(start, i);
      return {
        dateObj: d,
        date: format(d, 'd'),
        fullDate: format(d, 'yyyy-MM-dd'),
        isCurrentMonth: isSameMonth(d, currentDate),
        active: isSameDay(d, new Date())
      };
    });
  }

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'events'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snap) => {
      const fetchedEvents = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log('Fetched events from Firebase:', fetchedEvents);
      setEvents(fetchedEvents);
    }, (error) => {
      console.error('Error fetching events:', error);
      toast.error('Could not load events: ' + error.message);
    });
    return () => unsubscribe();
  }, [user]);

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'events'), {
        ...newEvent,
        userId: user.uid,
        createdAt: new Date().toISOString()
      });
      await logActivity('created', 'event', newEvent.title, user.uid, user.displayName || undefined);
      toast.success('Event added to schedule');
      setIsAddOpen(false);
      setNewEvent({ title: '', date: format(new Date(), 'yyyy-MM-dd'), timeStart: '08:00', timeEnd: '09:00', location: '', themeId: 0 });
    } catch (err: any) {
      toast.error('Failed to add event: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedEvent) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'events', selectedEvent.id), {
        title: selectedEvent.title,
        location: selectedEvent.location,
        date: selectedEvent.date,
        timeStart: selectedEvent.timeStart,
        timeEnd: selectedEvent.timeEnd,
        themeId: selectedEvent.themeId
      });
      await logActivity('updated', 'event', selectedEvent.title, user.uid, user.displayName || undefined);
      toast.success('Event updated');
      setIsEditOpen(false);
    } catch (err: any) {
      toast.error('Failed to update event');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async (id: string, title: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'events', id));
      await logActivity('deleted', 'event', title, user.uid, user.displayName || undefined);
      toast.success('Event deleted');
      setIsEditOpen(false);
    } catch (err: any) {
      toast.error('Failed to delete event');
    }
  };

  const firstName = user?.displayName?.split(' ')[0] || 'there';
  const weekLabel = view === 'today' 
    ? format(currentDate, 'MMM dd, yyyy') 
    : view === 'month' 
      ? format(currentDate, 'MMMM yyyy')
      : `${format(startOfCurrentWeek, 'MMM dd/MM')} - ${format(addDays(startOfCurrentWeek, 6), 'dd/MM')}`;

  const changeDate = (dir: number) => {
    if (view === 'today') setCurrentDate(prev => addDays(prev, dir));
    else if (view === 'week') setCurrentDate(prev => addWeeks(prev, dir));
    else setCurrentDate(prev => addMonths(prev, dir));
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] animate-in fade-in duration-500 relative">
      
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground leading-tight">
          Stay up to date, {firstName}
        </h1>
        
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => setIsAddOpen(true)}
            className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 px-6 h-10 shadow-sm"
          >
            Add event
          </Button>
          <button className="w-10 h-10 rounded-full bg-card/60 hover:bg-card border border-border shadow-sm flex items-center justify-center transition-colors">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Date & View Toggles */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
        <div className="flex items-center bg-primary text-primary-foreground rounded-full text-xs h-11 shadow-sm w-max">
          <button onClick={() => changeDate(-1)} className="px-4 h-full rounded-l-full hover:bg-primary/80 transition-colors">&lt;</button>
          <span className="px-2 font-medium">{weekLabel}</span>
          <button onClick={() => changeDate(1)} className="px-4 h-full rounded-r-full hover:bg-primary/80 transition-colors">&gt;</button>
        </div>

        <div className="flex bg-card/60 border border-border rounded-full p-1 shadow-sm w-max">
          <button onClick={() => { setView('today'); setCurrentDate(new Date()); }} className={`px-4 py-2.5 min-h-11 rounded-full text-xs font-medium transition-colors ${view === 'today' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>Today</button>
          <button onClick={() => setView('week')} className={`px-4 py-2.5 min-h-11 rounded-full text-xs font-medium transition-colors ${view === 'week' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>Week</button>
          <button onClick={() => setView('month')} className={`px-4 py-2.5 min-h-11 rounded-full text-xs font-medium transition-colors ${view === 'month' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>Month</button>
        </div>
      </div>

      {/* Calendar Wrapper */}
      <div className="flex-1 overflow-auto pb-6 relative">
        {view === 'month' ? (
          <div className="h-full flex flex-col min-w-[800px]">
            {/* Month Header */}
            <div className="grid grid-cols-7 border-b border-border mb-4 shrink-0">
              {['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].map((dayName, i) => (
                <div key={i} className="text-center pb-2">
                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${i >= 5 ? 'text-pink-400' : 'text-muted-foreground'}`}>
                    {dayName}
                  </span>
                </div>
              ))}
            </div>
            {/* Month Grid */}
            <div className="grid grid-cols-7 flex-1 border-l border-t border-border">
              {monthDays.map((day, i) => {
                const dayEvents = events.filter(e => e.date === day.fullDate);
                return (
                  <div key={i} className={`border-r border-b border-border p-2 ${!day.isCurrentMonth ? 'bg-muted/50' : 'bg-card'}`}>
                    <div className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${day.active ? 'bg-primary text-primary-foreground' : !day.isCurrentMonth ? 'text-muted-foreground' : 'text-foreground'}`}>
                      {day.date}
                    </div>
                    <div className="flex flex-col gap-1 mt-1">
                      {dayEvents.map((evt, idx) => {
                        const colorTheme = EVENT_COLORS[evt.themeId !== undefined ? evt.themeId : (idx % EVENT_COLORS.length)];
                        return (
                          <div key={evt.id} className={`text-[10px] px-1.5 py-0.5 rounded-md truncate font-medium ${colorTheme.bg}`}>
                            {evt.timeStart} {evt.title}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="min-w-[800px] h-full flex flex-col">
            
            {/* Days Header */}
            <div className="flex border-b border-border mb-4 shrink-0">
              <div className="w-16 shrink-0" /> {/* Time column spacing */}
              {visibleDays.map((day, i) => (
                <div key={i} className="flex-1 text-center pb-4 flex flex-col items-center justify-end">
                  {day.short && <span className="text-[10px] text-gray-400 absolute left-4">{day.short}</span>}
                  <div className={`
                    flex flex-col items-center justify-center py-2 px-6 rounded-[1.5rem]
                    ${day.active ? 'bg-primary text-primary-foreground shadow-md' : 'text-foreground'}
                    ${day.textLight ? 'text-pink-400' : ''}
                  `}>
                    <span className={`text-[10px] font-semibold uppercase tracking-wider ${day.active ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {day.name}
                    </span>
                    <span className={`text-sm font-bold mt-1 ${day.active ? 'text-white' : ''}`}>
                      {day.date}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Grid Area */}
          <div className="relative flex-1">
            {/* Horizontal Time Lines */}
            {TIMES.map((time, i) => (
              <div key={i} className="flex absolute w-full" style={{ top: `${i * 120}px` }}>
                <div className="w-16 shrink-0 text-right pr-4 text-[10px] font-medium text-muted-foreground -translate-y-2">
                  {time}
                </div>
                <div className="flex-1 border-t border-border" />
              </div>
            ))}

            {/* Current Time Indicator line */}
            <div className="absolute w-full flex items-center z-10" style={{ top: '60px' }}>
              <div className="w-16 shrink-0 text-right pr-2">
                <span className="text-[10px] font-bold text-pink-500 bg-pink-100 px-1.5 py-0.5 rounded-full">07:21</span>
              </div>
              <div className="flex-1 border-t border-dashed border-pink-400" />
            </div>

            {/* Event Cards */}
            <div className="absolute inset-0 left-16 flex">
              {visibleDays.map((day, dayIndex) => {
                const dayUserEvents = events.filter(e => e.date === day.fullDate);
                
                const allDayEvents = dayUserEvents.map((e, idx) => {
                  const colorTheme = EVENT_COLORS[e.themeId !== undefined ? e.themeId : (idx % EVENT_COLORS.length)];
                  return {
                    id: e.id,
                    timeStart: e.timeStart,
                    timeEnd: e.timeEnd,
                    title: e.title,
                    location: e.location,
                    color: colorTheme.bg,
                    icon: Users,
                    iconColor: colorTheme.icon,
                    description: e.description
                  };
                });

                return (
                  <div key={dayIndex} className="flex-1 relative border-r border-border last:border-0 px-2">
                    {allDayEvents.map((event: any) => {
                      const startIndex = TIMES.indexOf(event.timeStart);
                      const endIndex = TIMES.indexOf(event.timeEnd);
                      // Fallback if times not exactly matching TIMES array
                      const top = startIndex >= 0 ? startIndex * 120 : 0;
                      const height = endIndex > startIndex ? (endIndex - startIndex) * 120 - 10 : 110;
                      
                      return (
                        <div 
                          key={event.id}
                          onClick={() => { setSelectedEvent({...dayUserEvents.find(e => e.id === event.id)}); setIsEditOpen(true); }}
                          className={`absolute left-2 right-2 rounded-2xl p-3 shadow-sm flex flex-col gap-2 overflow-hidden cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 ${event.color}`}
                          style={{ top: `${top}px`, height: `${height}px`, zIndex: 5 }}
                        >
                          <div className="flex items-start justify-between">
                            {event.icon && (
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${event.iconColor}`}>
                                <event.icon className="w-3 h-3" />
                              </div>
                            )}
                            <div className="w-1 h-1 rounded-full bg-black/20" />
                          </div>

                          <div>
                            <h4 className="text-sm font-bold leading-tight">{event.title}</h4>
                            <p className="text-[10px] opacity-70 mt-0.5">{event.location}</p>
                            <p className="text-[10px] opacity-60 mt-0.5">{event.timeStart} - {event.timeEnd}</p>
                          </div>

                          {event.description && (
                            <p className="text-[10px] opacity-70 leading-relaxed mt-1 line-clamp-2">
                              {event.description}
                            </p>
                          )}

                          {event.tag && (
                            <div className="mt-auto">
                              <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${event.tagColor || 'bg-pink-200 text-pink-800'}`}>
                                {event.tag}
                              </span>
                            </div>
                          )}

                          {event.attachment && (
                            <div className="flex items-center gap-1 mt-1">
                              <FileText className="w-3 h-3 text-gray-600" />
                              <span className="text-[10px] font-medium underline underline-offset-2">{event.attachment}</span>
                            </div>
                          )}

                          {event.button && (
                            <button className="mt-auto w-full py-1.5 bg-black/10 hover:bg-black/20 text-gray-800 text-[10px] font-bold rounded-full transition-colors">
                              {event.button}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Add Event Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-[2rem]">
          <form onSubmit={handleAddEvent}>
            <DialogHeader>
              <DialogTitle>Add New Event</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Event Title</label>
                <Input 
                  required
                  placeholder="e.g. Weekly Sync"
                  className="rounded-full"
                  value={newEvent.title}
                  onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Location</label>
                <Input 
                  placeholder="e.g. Conference Room A"
                  className="rounded-full"
                  value={newEvent.location}
                  onChange={e => setNewEvent({...newEvent, location: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Date</label>
                <Input 
                  required
                  type="date"
                  className="rounded-full"
                  value={newEvent.date}
                  onChange={e => setNewEvent({...newEvent, date: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Start Time</label>
                  <select 
                    className="flex h-10 w-full rounded-full border border-black/5 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    value={newEvent.timeStart}
                    onChange={e => setNewEvent({...newEvent, timeStart: e.target.value})}
                  >
                    {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">End Time</label>
                  <select 
                    className="flex h-10 w-full rounded-full border border-black/5 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    value={newEvent.timeEnd}
                    onChange={e => setNewEvent({...newEvent, timeEnd: e.target.value})}
                  >
                    {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Event Color</label>
                <div className="flex items-center gap-3">
                  {EVENT_COLORS.map((theme, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setNewEvent({...newEvent, themeId: idx})}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${theme.bg} ${newEvent.themeId === idx ? 'border-gray-900 scale-110 shadow-md' : 'border-transparent hover:scale-105'}`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" className="rounded-full" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button type="submit" className="rounded-full bg-[#18181B] text-white" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Add Event'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* Edit Event Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-[2rem]">
          {selectedEvent && (
            <form onSubmit={handleEditEvent}>
              <DialogHeader>
                <div className="flex items-center justify-between pr-6">
                  <DialogTitle>Edit Event</DialogTitle>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    onClick={() => handleDeleteEvent(selectedEvent.id, selectedEvent.title)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Event Title</label>
                  <Input 
                    required
                    className="rounded-full"
                    value={selectedEvent.title}
                    onChange={e => setSelectedEvent({...selectedEvent, title: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Location</label>
                  <Input 
                    className="rounded-full"
                    value={selectedEvent.location}
                    onChange={e => setSelectedEvent({...selectedEvent, location: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Date</label>
                  <Input 
                    required
                    type="date"
                    className="rounded-full"
                    value={selectedEvent.date}
                    onChange={e => setSelectedEvent({...selectedEvent, date: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Start Time</label>
                    <select 
                      className="flex h-10 w-full rounded-full border border-black/5 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      value={selectedEvent.timeStart}
                      onChange={e => setSelectedEvent({...selectedEvent, timeStart: e.target.value})}
                    >
                      {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">End Time</label>
                    <select 
                      className="flex h-10 w-full rounded-full border border-black/5 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      value={selectedEvent.timeEnd}
                      onChange={e => setSelectedEvent({...selectedEvent, timeEnd: e.target.value})}
                    >
                      {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Event Color</label>
                  <div className="flex items-center gap-3">
                    {EVENT_COLORS.map((theme, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedEvent({...selectedEvent, themeId: idx})}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${theme.bg} ${selectedEvent.themeId === idx ? 'border-gray-900 scale-110 shadow-md' : 'border-transparent hover:scale-105'}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" className="rounded-full" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                <Button type="submit" className="rounded-full bg-[#18181B] text-white" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
