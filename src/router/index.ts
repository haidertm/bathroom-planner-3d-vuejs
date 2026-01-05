import { createRouter, createWebHistory } from 'vue-router'
import Landing from '../pages/Landing.vue'
import RoomShapeSelector from '../pages/RoomShapeSelector.vue'
import Planner from '../pages/Planner.vue' // Renamed from Home
import MyDesigns from '../pages/MyDesigns.vue'
import RoomDimensions from '../pages/RoomDimensions.vue'
import AdminLogin from '../pages/admin/AdminLogin.vue'
import AdminDashboard from '../pages/admin/AdminDashboard.vue'
import ProductEdit from '../pages/admin/ProductEdit.vue'
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
    // Admin Panel Routes
    {
        path: '/vadmin',
        name: 'AdminLogin',
        component: AdminLogin
    },
    {
        path: '/vadmin/dashboard',
        name: 'AdminDashboard',
        component: AdminDashboard,
        meta: { requiresAuth: true }
    },
    {
        path: '/vadmin/products/:id/edit',
        name: 'ProductEdit',
        component: ProductEdit,
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