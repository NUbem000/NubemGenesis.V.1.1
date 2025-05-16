import { createPortal } from 'react-dom'
import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { 
    Dialog, 
    DialogContent, 
    DialogTitle, 
    Box, 
    Typography, 
    Link,
    Divider,
    Chip
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import moment from 'moment'
import axios from 'axios'
import { baseURL } from '@/store/constant'

const AboutDialog = ({ show, onCancel }) => {
    const portalElement = document.getElementById('portal')
    const theme = useTheme()
    const [data, setData] = useState({})

    useEffect(() => {
        if (show) {
            const username = localStorage.getItem('username')
            const password = localStorage.getItem('password')

            const config = {}
            if (username && password) {
                config.auth = {
                    username,
                    password
                }
                config.headers = {
                    'Content-type': 'application/json',
                    'x-request-from': 'internal'
                }
            }
            
            const currentVersionReq = axios.get(`${baseURL}/api/v1/version`, { ...config })

            currentVersionReq
                .then((currentVersionData) => {
                    setData({
                        currentVersion: currentVersionData.data.version,
                        name: 'NubemGenesis',
                        description: 'Plataforma avanzada de IA generativa',
                        company: 'NubemSystems',
                        website: 'https://nubemsystems.es',
                        repo: 'https://github.com/NUbem000/NubemGenesis.V.1.1'
                    })
                })
                .catch((error) => {
                    console.error('Error fetching data:', error)
                    setData({
                        currentVersion: '1.0.0',
                        name: 'NubemGenesis',
                        description: 'Plataforma avanzada de IA generativa',
                        company: 'NubemSystems',
                        website: 'https://nubemsystems.es',
                        repo: 'https://github.com/NUbem000/NubemGenesis.V.1.1'
                    })
                })
        }
    }, [show])

    const component = show ? (
        <Dialog
            onClose={onCancel}
            open={show}
            fullWidth
            maxWidth='sm'
            aria-labelledby='alert-dialog-title'
            aria-describedby='alert-dialog-description'
        >
            <DialogTitle sx={{ 
                fontSize: '1.5rem', 
                color: theme.palette.primary.main,
                display: 'flex',
                alignItems: 'center',
                gap: 2
            }} id='alert-dialog-title'>
                <Box component="span">Acerca de {data.name}</Box>
                <Chip 
                    label={`v${data.currentVersion}`} 
                    size="small" 
                    color="primary"
                />
            </DialogTitle>
            <DialogContent>
                <Box sx={{ mb: 3 }}>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                        {data.description}
                    </Typography>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Typography variant="body2">
                            <strong>Desarrollado por:</strong> {data.company}
                        </Typography>
                        <Typography variant="body2">
                            <strong>Sitio web:</strong>{' '}
                            <Link href={data.website} target="_blank" rel="noopener noreferrer">
                                {data.website}
                            </Link>
                        </Typography>
                        <Typography variant="body2">
                            <strong>Repositorio:</strong>{' '}
                            <Link href={data.repo} target="_blank" rel="noopener noreferrer">
                                GitHub
                            </Link>
                        </Typography>
                    </Box>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Typography variant="body2" color="text.secondary">
                        &copy; {new Date().getFullYear()} {data.company}. Todos los derechos reservados.
                    </Typography>
                </Box>
            </DialogContent>
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

AboutDialog.propTypes = {
    show: PropTypes.bool,
    onCancel: PropTypes.func
}

export default AboutDialog