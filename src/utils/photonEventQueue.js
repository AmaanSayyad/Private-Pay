/**
 * Photon Event Queue Utility
 * 
 * Manages a queue of failed Photon events in localStorage for retry.
 * Implements exponential backoff and automatic retry logic.
 * 
 * Requirement 2.5: Log errors without blocking user workflow
 * Requirement 3.5: Queue events for retry on network errors
 */

const EVENT_QUEUE_KEY = 'photon_event_queue';
const MAX_RETRY_ATTEMPTS = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

/**
 * Event queue item structure
 * @typedef {Object} QueuedEvent
 * @property {string} id - Unique event ID
 * @property {string} type - 'rewarded' or 'unrewarded'
 * @property {Object} eventData - The event data to send
 * @property {number} attempts - Number of retry attempts
 * @property {number} timestamp - When the event was first queued
 * @property {number} nextRetry - Timestamp for next retry attempt
 */

/**
 * Get all queued events from localStorage
 * @returns {QueuedEvent[]} Array of queued events
 */
export function getQueuedEvents() {
  try {
    const queueData = localStorage.getItem(EVENT_QUEUE_KEY);
    if (!queueData) {
      return [];
    }

    // Validate that the data is valid JSON before parsing
    if (typeof queueData !== 'string' || !queueData.trim().startsWith('[')) {
      console.warn('Invalid event queue data in localStorage, clearing...');
      clearEventQueue();
      return [];
    }

    return JSON.parse(queueData);
  } catch (error) {
    console.error('Failed to retrieve event queue:', error);
    // Clear corrupted data
    try {
      localStorage.removeItem(EVENT_QUEUE_KEY);
    } catch (clearError) {
      console.error('Failed to clear corrupted event queue data:', clearError);
    }
    return [];
  }
}

/**
 * Save queued events to localStorage
 * @param {QueuedEvent[]} events - Array of events to save
 */
function saveQueuedEvents(events) {
  try {
    localStorage.setItem(EVENT_QUEUE_KEY, JSON.stringify(events));
  } catch (error) {
    console.error('Failed to save event queue:', error);
  }
}

/**
 * Add an event to the retry queue
 * @param {string} type - Event type ('rewarded' or 'unrewarded')
 * @param {Object} eventData - The event data
 * @returns {string} The queued event ID
 */
export function queueEvent(type, eventData) {
  const events = getQueuedEvents();
  
  const queuedEvent = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    eventData,
    attempts: 0,
    timestamp: Date.now(),
    nextRetry: Date.now(), // Retry immediately on next process
  };

  events.push(queuedEvent);
  saveQueuedEvents(events);

  console.log(`Event queued for retry: ${queuedEvent.id}`);
  return queuedEvent.id;
}

/**
 * Remove an event from the queue
 * @param {string} eventId - The event ID to remove
 */
export function removeQueuedEvent(eventId) {
  const events = getQueuedEvents();
  const filteredEvents = events.filter(event => event.id !== eventId);
  saveQueuedEvents(filteredEvents);
}

/**
 * Update an event's retry information
 * @param {string} eventId - The event ID
 * @param {number} attempts - New attempt count
 */
function updateEventRetry(eventId, attempts) {
  const events = getQueuedEvents();
  const eventIndex = events.findIndex(event => event.id === eventId);
  
  if (eventIndex !== -1) {
    events[eventIndex].attempts = attempts;
    // Exponential backoff: 1s, 2s, 4s, 8s, etc.
    const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempts);
    events[eventIndex].nextRetry = Date.now() + delay;
    saveQueuedEvents(events);
  }
}

/**
 * Get events that are ready for retry
 * @returns {QueuedEvent[]} Events ready to retry
 */
export function getEventsReadyForRetry() {
  const events = getQueuedEvents();
  const now = Date.now();
  
  return events.filter(event => {
    // Check if it's time to retry
    if (event.nextRetry > now) {
      return false;
    }
    
    // Check if max attempts reached
    if (event.attempts >= MAX_RETRY_ATTEMPTS) {
      console.warn(`Event ${event.id} exceeded max retry attempts, removing from queue`);
      removeQueuedEvent(event.id);
      return false;
    }
    
    return true;
  });
}

/**
 * Process the event queue by retrying failed events
 * @param {Function} sendRewardedEventFn - Function to send rewarded events
 * @param {Function} sendUnrewardedEventFn - Function to send unrewarded events
 * @returns {Promise<{success: number, failed: number}>} Results of processing
 */
export async function processEventQueue(sendRewardedEventFn, sendUnrewardedEventFn) {
  const eventsToRetry = getEventsReadyForRetry();
  
  if (eventsToRetry.length === 0) {
    return { success: 0, failed: 0 };
  }

  console.log(`Processing ${eventsToRetry.length} queued events`);

  let successCount = 0;
  let failedCount = 0;

  for (const queuedEvent of eventsToRetry) {
    try {
      const sendFn = queuedEvent.type === 'rewarded' 
        ? sendRewardedEventFn 
        : sendUnrewardedEventFn;

      await sendFn(queuedEvent.eventData);
      
      // Success - remove from queue
      removeQueuedEvent(queuedEvent.id);
      successCount++;
      console.log(`Successfully retried event ${queuedEvent.id}`);
    } catch (error) {
      // Failed - update retry count
      const newAttempts = queuedEvent.attempts + 1;
      
      if (newAttempts >= MAX_RETRY_ATTEMPTS) {
        console.error(`Event ${queuedEvent.id} failed after ${MAX_RETRY_ATTEMPTS} attempts, removing from queue`);
        removeQueuedEvent(queuedEvent.id);
      } else {
        console.warn(`Event ${queuedEvent.id} retry failed (attempt ${newAttempts}/${MAX_RETRY_ATTEMPTS})`);
        updateEventRetry(queuedEvent.id, newAttempts);
      }
      
      failedCount++;
    }
  }

  return { success: successCount, failed: failedCount };
}

/**
 * Clear all queued events (useful for logout or reset)
 */
export function clearEventQueue() {
  try {
    localStorage.removeItem(EVENT_QUEUE_KEY);
    console.log('Event queue cleared');
  } catch (error) {
    console.error('Failed to clear event queue:', error);
  }
}

/**
 * Get queue statistics
 * @returns {Object} Queue stats
 */
export function getQueueStats() {
  const events = getQueuedEvents();
  return {
    total: events.length,
    rewarded: events.filter(e => e.type === 'rewarded').length,
    unrewarded: events.filter(e => e.type === 'unrewarded').length,
    readyForRetry: getEventsReadyForRetry().length,
  };
}
