import { lazy } from 'react'

// Project imports
import Loadable from '@/ui-component/loading/Loadable'

// Legal pages
const PrivacyPolicy = Loadable(lazy(() => import('@/views/legal/PrivacyPolicy')))
const TermsOfService = Loadable(lazy(() => import('@/views/legal/TermsOfService')))

// ==============================|| LEGAL ROUTING ||============================== //

const LegalRoutes = {
    path: '/',
    children: [
        {
            path: 'privacy',
            element: <PrivacyPolicy />
        },
        {
            path: 'terms',
            element: <TermsOfService />
        }
    ]
}

export default LegalRoutes