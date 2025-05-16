import { Container, Typography, Box, Paper } from '@mui/material'
import { useTheme } from '@mui/material/styles'

const TermsOfService = () => {
    const theme = useTheme()

    return (
        <Container maxWidth="md" sx={{ py: 5 }}>
            <Paper sx={{ p: 4 }}>
                <Typography variant="h3" gutterBottom sx={{ color: theme.palette.primary.main }}>
                    Términos de Servicio
                </Typography>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                    Última actualización: {new Date().toLocaleDateString('es-ES')}
                </Typography>

                <Box sx={{ '& h4': { mt: 3, mb: 2, color: theme.palette.primary.main } }}>
                    <Typography variant="h4">1. Aceptación de los Términos</Typography>
                    <Typography variant="body1" paragraph>
                        Al acceder y utilizar NubemGenesis, usted acepta estar sujeto a estos Términos de Servicio. 
                        Si no está de acuerdo con alguna parte de estos términos, no debe usar nuestro servicio.
                    </Typography>

                    <Typography variant="h4">2. Descripción del Servicio</Typography>
                    <Typography variant="body1" paragraph>
                        NubemGenesis es una plataforma de desarrollo de inteligencia artificial generativa que permite:
                    </Typography>
                    <ul>
                        <Typography component="li" variant="body1">Crear flujos de trabajo de IA visualmente</Typography>
                        <Typography component="li" variant="body1">Integrar múltiples modelos de lenguaje</Typography>
                        <Typography component="li" variant="body1">Desarrollar agentes inteligentes</Typography>
                        <Typography component="li" variant="body1">Acceder a APIs RESTful</Typography>
                    </ul>

                    <Typography variant="h4">3. Cuenta de Usuario</Typography>
                    <Typography variant="body1" paragraph>
                        Para usar ciertos servicios, debe crear una cuenta:
                    </Typography>
                    <ul>
                        <Typography component="li" variant="body1">Proporcionar información precisa y completa</Typography>
                        <Typography component="li" variant="body1">Mantener la seguridad de su cuenta</Typography>
                        <Typography component="li" variant="body1">Notificar inmediatamente cualquier uso no autorizado</Typography>
                        <Typography component="li" variant="body1">Ser responsable de todas las actividades bajo su cuenta</Typography>
                    </ul>

                    <Typography variant="h4">4. Uso Aceptable</Typography>
                    <Typography variant="body1" paragraph>
                        Usted acepta no usar NubemGenesis para:
                    </Typography>
                    <ul>
                        <Typography component="li" variant="body1">Violar leyes o regulaciones</Typography>
                        <Typography component="li" variant="body1">Infringir derechos de propiedad intelectual</Typography>
                        <Typography component="li" variant="body1">Distribuir malware o contenido dañino</Typography>
                        <Typography component="li" variant="body1">Realizar actividades fraudulentas</Typography>
                        <Typography component="li" variant="body1">Abusar de los recursos del sistema</Typography>
                    </ul>

                    <Typography variant="h4">5. Propiedad Intelectual</Typography>
                    <Typography variant="body1" paragraph>
                        <strong>Su Contenido:</strong> Usted retiene todos los derechos sobre el contenido que crea usando NubemGenesis.
                    </Typography>
                    <Typography variant="body1" paragraph>
                        <strong>Nuestra Plataforma:</strong> NubemGenesis y su código fuente son propiedad de NubemSystems, 
                        licenciados bajo términos específicos.
                    </Typography>

                    <Typography variant="h4">6. Limitación de Responsabilidad</Typography>
                    <Typography variant="body1" paragraph>
                        En la máxima medida permitida por la ley, NubemGenesis no será responsable por:
                    </Typography>
                    <ul>
                        <Typography component="li" variant="body1">Daños indirectos o consecuentes</Typography>
                        <Typography component="li" variant="body1">Pérdida de datos o beneficios</Typography>
                        <Typography component="li" variant="body1">Interrupciones del servicio</Typography>
                        <Typography component="li" variant="body1">Errores o inexactitudes en el contenido</Typography>
                    </ul>

                    <Typography variant="h4">7. Indemnización</Typography>
                    <Typography variant="body1" paragraph>
                        Usted acepta indemnizar y mantener indemne a NubemGenesis y NubemSystems de cualquier reclamo 
                        derivado de su uso del servicio o violación de estos términos.
                    </Typography>

                    <Typography variant="h4">8. Modificaciones del Servicio</Typography>
                    <Typography variant="body1" paragraph>
                        Nos reservamos el derecho de modificar o discontinuar el servicio en cualquier momento, 
                        con o sin previo aviso.
                    </Typography>

                    <Typography variant="h4">9. Terminación</Typography>
                    <Typography variant="body1" paragraph>
                        Podemos terminar o suspender su cuenta inmediatamente, sin previo aviso, por violación 
                        de estos términos.
                    </Typography>

                    <Typography variant="h4">10. Ley Aplicable</Typography>
                    <Typography variant="body1" paragraph>
                        Estos términos se rigen por las leyes de España, sin consideración a conflictos de 
                        disposiciones legales.
                    </Typography>

                    <Typography variant="h4">11. Contacto</Typography>
                    <Typography variant="body1" paragraph>
                        Para preguntas sobre estos términos, contáctenos en:
                    </Typography>
                    <Typography variant="body1">
                        <strong>Email:</strong> legal@nubemgenesis.ai<br/>
                        <strong>Dirección:</strong> NubemSystems<br/>
                        España
                    </Typography>
                </Box>
            </Paper>
        </Container>
    )
}

export default TermsOfService