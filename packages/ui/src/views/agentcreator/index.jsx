import React, { useState } from 'react'
import { Box, Button, Typography, Stack, Grid, Card, CardContent, CardActionArea } from '@mui/material'
import { IconPlus, IconSparkles, IconTemplate, IconHistory, IconTrendingUp } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'

// Components
import MainCard from '@/ui-component/cards/MainCard'
import AgentCreatorDialog from './AgentCreatorDialog'
import TemplateSelector from './components/TemplateSelector'
import { StyledButton } from '@/ui-component/button/StyledButton'

// Store
import { enqueueSnackbar as enqueueSnackbarAction } from '@/store/actions'

const AgentCreator = () => {
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const [dialogOpen, setDialogOpen] = useState(false)
    const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
    const [prefilledData, setPrefilledData] = useState(null)

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))

    const handleAgentCreated = (agent) => {
        // Navigate to the agent details or chat view
        navigate(`/canvas/${agent.id}`)
        enqueueSnackbar({
            message: `Agent "${agent.name}" created successfully!`,
            options: {
                variant: 'success',
                action: (
                    <Button 
                        size="small" 
                        color="inherit"
                        onClick={() => navigate(`/chatbot/${agent.id}`)}
                    >
                        Test Now
                    </Button>
                )
            }
        })
    }

    const handleTemplateSelect = (templateData) => {
        setPrefilledData(templateData)
        setTemplateDialogOpen(false)
        setDialogOpen(true)
    }

    const quickActions = [
        {
            title: 'Start from Template',
            description: 'Choose from pre-built agent templates',
            icon: <IconTemplate size={48} />,
            color: 'primary',
            onClick: () => setTemplateDialogOpen(true)
        },
        {
            title: 'Custom Agent',
            description: 'Create a unique agent from scratch',
            icon: <IconSparkles size={48} />,
            color: 'secondary',
            onClick: () => {
                setPrefilledData(null)
                setDialogOpen(true)
            }
        },
        {
            title: 'Recent Agents',
            description: 'View and manage your agents',
            icon: <IconHistory size={48} />,
            color: 'info',
            onClick: () => navigate('/chatflows')
        }
    ]

    return (
        <>
            <MainCard>
                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
                    <Typography variant="h3">AI Agent Creator</Typography>
                    <StyledButton
                        variant="contained"
                        startIcon={<IconSparkles />}
                        onClick={() => setDialogOpen(true)}
                    >
                        Create with AI
                    </StyledButton>
                </Stack>

                {/* Hero Section */}
                <Box sx={{ textAlign: 'center', mb: 6 }}>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                        Create powerful AI agents in minutes. No coding required.
                    </Typography>
                </Box>

                {/* Quick Actions Grid */}
                <Grid container spacing={3} sx={{ mb: 6 }}>
                    {quickActions.map((action, index) => (
                        <Grid item xs={12} md={4} key={index}>
                            <Card 
                                sx={{ 
                                    height: '100%',
                                    transition: 'all 0.3s',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: 3
                                    }
                                }}
                            >
                                <CardActionArea 
                                    onClick={action.onClick}
                                    sx={{ height: '100%' }}
                                >
                                    <CardContent sx={{ textAlign: 'center', py: 4 }}>
                                        <Box 
                                            sx={{ 
                                                color: `${action.color}.main`,
                                                mb: 2,
                                                opacity: 0.8
                                            }}
                                        >
                                            {action.icon}
                                        </Box>
                                        <Typography variant="h6" gutterBottom>
                                            {action.title}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {action.description}
                                        </Typography>
                                    </CardContent>
                                </CardActionArea>
                            </Card>
                        </Grid>
                    ))}
                </Grid>

                {/* Popular Use Cases */}
                <Box sx={{ mt: 6 }}>
                    <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                        <IconTrendingUp size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />
                        Popular Use Cases
                    </Typography>
                    <Stack direction="row" spacing={2} flexWrap="wrap">
                        {[
                            'Customer Support',
                            'Document Analysis',
                            'Content Creation',
                            'Data Processing',
                            'Web Research',
                            'Sales Assistant'
                        ].map((useCase) => (
                            <Button
                                key={useCase}
                                variant="outlined"
                                size="small"
                                onClick={() => {
                                    setPrefilledData({ description: `I need an AI agent for ${useCase.toLowerCase()}` })
                                    setDialogOpen(true)
                                }}
                                sx={{ mb: 1 }}
                            >
                                {useCase}
                            </Button>
                        ))}
                    </Stack>
                </Box>
            </MainCard>

            <AgentCreatorDialog
                open={dialogOpen}
                onClose={() => {
                    setDialogOpen(false)
                    setPrefilledData(null)
                }}
                onAgentCreated={handleAgentCreated}
                initialData={prefilledData}
            />

            <TemplateSelector
                open={templateDialogOpen}
                onClose={() => setTemplateDialogOpen(false)}
                onSelect={handleTemplateSelect}
            />
        </>
    )
}

export default AgentCreator