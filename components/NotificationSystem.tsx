import React, { useEffect, useRef } from 'react';
import { useStore } from '../store/store';

export const NotificationSystem: React.FC = () => {
    const notifications = useStore(state => state.notifications);
    const removeNotification = useStore(state => state.removeNotification);
    const timeoutRefs = useRef<Map<number, number>>(new Map());

    useEffect(() => {
        const currentNotificationIds = new Set(notifications.map(n => n.id));

        // Set timeouts for new notifications
        notifications.forEach(notification => {
            if (!timeoutRefs.current.has(notification.id)) {
                const timeoutId = window.setTimeout(() => {
                    removeNotification(notification.id);
                    timeoutRefs.current.delete(notification.id);
                }, notification.duration || 3000);
                timeoutRefs.current.set(notification.id, timeoutId);
            }
        });

        // Clear timeouts for notifications that were removed from the store before their timeout completed
        timeoutRefs.current.forEach((timeoutId, notificationId) => {
            if (!currentNotificationIds.has(notificationId)) {
                clearTimeout(timeoutId);
                timeoutRefs.current.delete(notificationId);
            }
        });

    }, [notifications, removeNotification]);

    // Cleanup all remaining timeouts on unmount
    useEffect(() => {
        const timeouts = timeoutRefs.current;
        return () => {
            timeouts.forEach(timeoutId => {
                clearTimeout(timeoutId);
            });
        };
    }, []);

    const getIcon = (type: string) => {
        switch (type) {
            case 'success':
                return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>;
            case 'error':
                return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>;
            case 'info':
                return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>;
            default:
                return null;
        }
    };

    const getTypeClasses = (type: string) => {
        switch (type) {
            case 'success':
                return 'bg-green-600/90 border-green-500/80 text-white';
            case 'error':
                return 'bg-red-600/90 border-red-500/80 text-white';
            case 'info':
                return 'bg-blue-600/90 border-blue-500/80 text-white';
            default:
                return 'bg-neutral-700/90 border-neutral-600/80 text-neutral-200';
        }
    };

    return (
        <div className="fixed top-24 right-4 z-[200] w-72 space-y-2 pointer-events-none">
            {notifications.map(notification => (
                <div
                    key={notification.id}
                    className={`flex items-start p-3 rounded-lg border backdrop-blur-md shadow-lg pointer-events-auto animate-slide-up ${getTypeClasses(notification.type)}`}
                >
                    <div className="flex-shrink-0 mr-2 mt-0.5">
                        {getIcon(notification.type)}
                    </div>
                    <p className="text-sm font-medium">{notification.message}</p>
                    <button onClick={() => removeNotification(notification.id)} className="ml-auto -mr-1 -mt-1 p-1 rounded-full hover:bg-white/20 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            ))}
        </div>
    );
};