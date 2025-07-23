/// <reference types="vite-plugin-pwa/client" />

// #v-ifdef VITE_IS_ONLINE
import { registerSW } from 'virtual:pwa-register'
// #v-endif

import { ShowDialog } from '../../components/Dialog'
import i18n from '../../i18n'

async function PWAPopup(update: (reloadPage?: boolean) => Promise<void>) {
    const result = await ShowDialog({
        title: i18n.t('Updates are available, please confirm!!') ?? '',
        button: i18n.t('Update') ?? '',
    })

    if (result === 'action') {
        update(true)
    }
}
export function PWACheck() {
    if (import.meta.env.MODE !== 'online') return
    const updateSW = registerSW({
        onNeedRefresh() {
            console.log('Update available, please refresh!!')
            PWAPopup(updateSW)
        },
        onOfflineReady() {
            console.log('Offline mode is now enabled!!')
        },
    })
}
