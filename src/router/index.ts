import { createRouter, createWebHistory } from 'vue-router'

const routes = [
    {
        path: '/',
        name: 'Landing',
        component: () => import('../pages/Landing.vue')
    },
    {
        path: '/room-shape',
        name: 'RoomShapeSelector',
        component: () => import('../pages/RoomShapeSelector.vue')
    },
    {
        path: '/room-dimensions',
        name: 'RoomDimensions',
        component: () => import('../pages/RoomDimensions.vue')
    },
    {
        path: '/planner',
        name: 'Planner',
        component: () => import('../pages/Planner.vue')
    },
    {
        path: '/my-designs',
        name: 'MyDesigns',
        component: () => import('../pages/MyDesigns.vue')
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router