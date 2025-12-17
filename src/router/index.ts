import { createRouter, createWebHistory } from 'vue-router'
import Landing from '../pages/Landing.vue'
import RoomShapeSelector from '../pages/RoomShapeSelector.vue'
import Planner from '../pages/Planner.vue' // Renamed from Home
import MyDesigns from '../pages/MyDesigns.vue'
import RoomDimensions from '../pages/RoomDimensions.vue'

const routes = [
    {
        path: '/',
        name: 'Landing',
        component: Landing
    },
    {
        path: '/room-shape',
        name: 'RoomShapeSelector',
        component: RoomShapeSelector
    },
    {
        path: '/room-dimensions',
        name: 'RoomDimensions',
        component: RoomDimensions
    },
    {
        path: '/planner',
        name: 'Planner',
        component: Planner
    },
    {
        path: '/my-designs',
        name: 'MyDesigns',
        component: MyDesigns
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router