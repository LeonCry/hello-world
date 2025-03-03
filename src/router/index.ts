import type { RouteRecordRaw } from 'vue-router';
import { createRouter, createWebHashHistory } from 'vue-router';

const routes: Array<RouteRecordRaw> = [
  { path: '/', redirect: '/main' },
  {
    path: '/main',
    component: () => import('@/layouts/defaultLayout.vue'),
    children: [
      {
        path: 'responseSystem',
        component: () => import('@/views/responseSystem/index.vue'),
      },
      {
        path: 'compute-watch',
        component: () => import('@/views/compute&watch/index.vue'),
      },
      {
        path: 'reactive',
        component: () => import('@/views/reactive/index.vue'),
      },
      {
        path: 'ref',
        component: () => import('@/views/ref/index.vue'),
      },
      {
        path: 'render',
        component: () => import('@/views/render/index.vue'),
      },
    ],
  },
];

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
});

export default router;
