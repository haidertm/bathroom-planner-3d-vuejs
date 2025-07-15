import { createRouter, createWebHistory } from 'vue-router'
import RoomShapeSelector from '../pages/RoomShapeSelector.vue'
import Planner from '../pages/Planner.vue' // Renamed from Home
import MyDesigns from '../pages/MyDesigns.vue'

const routes = [
    {
        path: '/',
        name: 'RoomShapeSelector',
        component: RoomShapeSelector
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