import { createRouter, createWebHistory } from 'vue-router'
import Landing from '../pages/Landing.vue'
import RoomShapeSelector from '../pages/RoomShapeSelector.vue'
import Planner from '../pages/Planner.vue' // Renamed from Home
import MyDesigns from '../pages/MyDesigns.vue'
import RoomDimensions from '../pages/RoomDimensions.vue'
import NotFound from '../pages/NotFound.vue'
import { loadSession } from '../composables/useAdminAuth'

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
    },
    // Admin Panel Routes (lazy-loaded)
    {
        path: '/vadmin',
        name: 'AdminLogin',
        component: () => import('../pages/admin/AdminLogin.vue')
    },
    {
        path: '/vadmin/dashboard',
        name: 'AdminDashboard',
        component: () => import('../pages/admin/AdminDashboard.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/vadmin/products/:id/edit',
        name: 'ProductEdit',
        component: () => import('../pages/admin/ProductEdit.vue'),
        meta: { requiresAuth: true }
    },
    // 404 - Catch all unmatched routes
    {
        path: '/:pathMatch(.*)*',
        name: 'NotFound',
        component: NotFound
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

// Navigation guard for admin routes
router.beforeEach((to, _from, next) => {
    if (to.meta.requiresAuth) {
        // Use shared session validation from useAdminAuth
        const session = loadSession()
        if (session) {
            next()
        } else {
            next('/vadmin')
        }
    } else {
        next()
    }
})

export default router