import logo from '@/assets/images/nubemgenesis_white.svg'
import logoDark from '@/assets/images/nubemgenesis_dark.svg'

import { useSelector } from 'react-redux'

// ==============================|| LOGO ||============================== //

const Logo = () => {
    const customization = useSelector((state) => state.customization)

    return (
        <div style={{ alignItems: 'center', display: 'flex', flexDirection: 'row', marginLeft: '10px' }}>
            <img
                style={{ objectFit: 'contain', height: 'auto', width: 180 }}
                src={customization.isDarkMode ? logoDark : logo}
                alt='NubemGenesis'
            />
        </div>
    )
}

export default Logo
