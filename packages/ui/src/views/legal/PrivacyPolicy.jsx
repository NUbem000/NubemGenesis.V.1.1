import { Container, Typography, Box, Paper, Link } from '@mui/material'
import { useTheme } from '@mui/material/styles'

const PrivacyPolicy = () => {
    const theme = useTheme()

    return (
        <Container maxWidth="md" sx={{ py: 5 }}>
            <Paper sx={{ p: 4 }}>
                <Typography variant="h3" gutterBottom sx={{ color: theme.palette.primary.main }}>
                    Política de Privacidad
                </Typography>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                    Última actualización: {new Date().toLocaleDateString('es-ES')}
                </Typography>

                <Box sx={{ '& h4': { mt: 3, mb: 2, color: theme.palette.primary.main } }}>
                    <Typography variant="h4">1. Información que Recopilamos</Typography>
                    <Typography variant="body1" paragraph>
                        En NubemGenesis recopilamos información para proporcionar mejores servicios a nuestros usuarios:
                    </Typography>
                    <ul>
                        <Typography component="li" variant="body1">
                            <strong>Información de cuenta:</strong> nombre, email, organización
                        </Typography>
                        <Typography component="li" variant="body1">
                            <strong>Datos de uso:</strong> flujos creados, interacciones con la plataforma
                        </Typography>
                        <Typography component="li" variant="body1">
                            <strong>Información técnica:</strong> logs, direcciones IP, tipo de navegador
                        </Typography>
                    </ul>

                    <Typography variant="h4">2. Cómo Usamos la Información</Typography>
                    <Typography variant="body1" paragraph>
                        Utilizamos la información recopilada para:
                    </Typography>
                    <ul>
                        <Typography component="li" variant="body1">Proporcionar y mantener nuestros servicios</Typography>
                        <Typography component="li" variant="body1">Mejorar la experiencia del usuario</Typography>
                        <Typography component="li" variant="body1">Comunicarnos con los usuarios</Typography>
                        <Typography component="li" variant="body1">Detectar y prevenir fraudes</Typography>
                    </ul>

                    <Typography variant="h4">3. Seguridad de Datos</Typography>
                    <Typography variant="body1" paragraph>
                        Implementamos medidas de seguridad apropiadas para proteger su información:
                    </Typography>
                    <ul>
                        <Typography component="li" variant="body1">Encriptación de datos en tránsito y reposo</Typography>
                        <Typography component="li" variant="body1">Acceso restringido a información personal</Typography>
                        <Typography component="li" variant="body1">Auditorías de seguridad regulares</Typography>
                        <Typography component="li" variant="body1">Cumplimiento con GDPR</Typography>
                    </ul>

                    <Typography variant="h4">4. Compartir Información</Typography>
                    <Typography variant="body1" paragraph>
                        No vendemos ni compartimos su información personal, excepto en los siguientes casos:
                    </Typography>
                    <ul>
                        <Typography component="li" variant="body1">Con su consentimiento explícito</Typography>
                        <Typography component="li" variant="body1">Para cumplir con obligaciones legales</Typography>
                        <Typography component="li" variant="body1">Con proveedores de servicios bajo acuerdos de confidencialidad</Typography>
                    </ul>

                    <Typography variant="h4">5. Sus Derechos</Typography>
                    <Typography variant="body1" paragraph>
                        Usted tiene derecho a:
                    </Typography>
                    <ul>
                        <Typography component="li" variant="body1">Acceder a sus datos personales</Typography>
                        <Typography component="li" variant="body1">Rectificar información incorrecta</Typography>
                        <Typography component="li" variant="body1">Solicitar la eliminación de sus datos</Typography>
                        <Typography component="li" variant="body1">Oponerse al procesamiento de sus datos</Typography>
                        <Typography component="li" variant="body1">Portabilidad de datos</Typography>
                    </ul>

                    <Typography variant="h4">6. Cookies</Typography>
                    <Typography variant="body1" paragraph>
                        Utilizamos cookies para mejorar la experiencia del usuario. Puede configurar su navegador para rechazar cookies, 
                        aunque esto puede afectar algunas funcionalidades del servicio.
                    </Typography>

                    <Typography variant="h4">7. Cambios en esta Política</Typography>
                    <Typography variant="body1" paragraph>
                        Podemos actualizar esta política de privacidad ocasionalmente. Le notificaremos sobre cambios significativos 
                        publicando la nueva política en esta página.
                    </Typography>

                    <Typography variant="h4">8. Contacto</Typography>
                    <Typography variant="body1" paragraph>
                        Si tiene preguntas sobre esta política de privacidad, contáctenos en:
                    </Typography>
                    <Typography variant="body1">
                        <strong>Email:</strong> privacy@nubemgenesis.ai<br/>
                        <strong>Dirección:</strong> NubemSystems<br/>
                        España
                    </Typography>
                </Box>
            </Paper>
        </Container>
    )
}

export default PrivacyPolicy