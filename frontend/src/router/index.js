// Router configuration for Smart Environmental Monitor

const routes = [
    {
        path: '/',
        name: 'Dashboard',
        component: () => import('@views/Dashboard.vue'),
        meta: {
            title: 'Dashboard',
            description: 'Real-time environmental monitoring dashboard',
            icon: 'HomeIcon'
        }
    },
    {
        path: '/sensors',
        name: 'Sensors',
        component: () => import('@views/Sensors.vue'),
        meta: {
            title: 'Sensors',
            description: 'Detailed sensor readings and configuration',
            icon: 'CpuChipIcon'
        }
    },
    {
        path: '/devices',
        name: 'Devices',
        component: () => import('@views/Devices.vue'),
        meta: {
            title: 'Device Control',
            description: 'Control actuators and devices',
            icon: 'Cog6ToothIcon'
        }
    },
    {
        path: '/history',
        name: 'History',
        component: () => import('@views/History.vue'),
        meta: {
            title: 'Historical Data',
            description: 'View historical sensor data and trends',
            icon: 'ChartBarIcon'
        }
    },
    {
        path: '/alerts',
        name: 'Alerts',
        component: () => import('@views/Alerts.vue'),
        meta: {
            title: 'Alerts & Notifications',
            description: 'Configure alert thresholds and notifications',
            icon: 'BellIcon'
        }
    },
    {
        path: '/settings',
        name: 'Settings',
        component: () => import('@views/Settings.vue'),
        meta: {
            title: 'System Settings',
            description: 'Configure system preferences and calibration',
            icon: 'AdjustmentsHorizontalIcon'
        }
    },
    {
        path: '/system',
        name: 'System',
        component: () => import('@views/System.vue'),
        meta: {
            title: 'System Status',
            description: 'System health, logs, and diagnostics',
            icon: 'CircuitBoardIcon'
        }
    },
    // Development routes
    {
        path: '/dev',
        name: 'Development',
        component: () => import('@views/Development.vue'),
        meta: {
            title: 'Development Tools',
            description: 'Testing and debugging tools',
            icon: 'WrenchScrewdriverIcon',
            requiresDev: true
        }
    },
    // Error routes
    {
        path: '/error',
        name: 'Error',
        component: () => import('@views/Error.vue'),
        meta: {
            title: 'Error',
            hideInNav: true
        }
    },
    {
        path: '/:pathMatch(.*)*',
        name: 'NotFound',
        component: () => import('@views/NotFound.vue'),
        meta: {
            title: 'Page Not Found',
            hideInNav: true
        }
    }
]

export default routes