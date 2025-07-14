import { createRouter, createWebHistory } from 'vue-router'
import Home from '../pages/Home.vue' // Updated to match your actual file name
import MyDesigns from '../pages/MyDesigns.vue'

const routes = [
    {
        path: '/',
        name: 'Home',
        component: Home
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