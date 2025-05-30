import React, { useState, useEffect } from 'react'
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Stepper,
    Step,
    StepLabel,
    Typography,
    Stack,
    IconButton,
    Box,
    useTheme,
    useMediaQuery,
    LinearProgress
} from '@mui/material'
import { IconX, IconSparkles } from '@tabler/icons-react'

// Step Components
import DescribeNeedStep from './steps/DescribeNeedStep'
import ClarificationStep from './steps/ClarificationStep'
import ConfigurationStep from './steps/ConfigurationStep'
import DeploymentStep from './steps/DeploymentStep'
import AccessStep from './steps/AccessStep'

// Hooks
import { useOrchestration } from './hooks/useOrchestration'

const AgentCreatorDialog = ({ open, onClose, onAgentCreated, initialData }) => {
    const theme = useTheme()
    const fullScreen = useMediaQuery(theme.breakpoints.down('md'))
    
    const [currentStep, setCurrentStep] = useState(0)
    const [loading, setLoading] = useState(false)
    const [agentData, setAgentData] = useState({
        description: '',
        questions: [],
        clarifications: {},
        configuration: null,
        deployment: null,
        agent: null
    })

    const { analyzeRequest, generateAgent, deployAgent } = useOrchestration()

    // Reset state when dialog closes or apply initial data
    useEffect(() => {
        if (!open) {
            setCurrentStep(0)
            setAgentData({
                description: '',
                questions: [],
                clarifications: {},
                configuration: null,
                deployment: null,
                agent: null
            })
        } else if (initialData) {
            setAgentData(prev => ({
                ...prev,
                description: initialData.description || '',
                clarifications: initialData.clarifications || {}
            }))
        }
    }, [open, initialData])

    const handleDescriptionSubmit = async (description) => {
        setLoading(true)
        try {
            // If we have prefilled clarifications from a template, skip analysis
            if (agentData.clarifications && Object.keys(agentData.clarifications).length > 0) {
                // Generate agent directly with template data
                const config = await generateAgent(description, agentData.clarifications)
                
                setAgentData(prev => ({
                    ...prev,
                    description,
                    configuration: config
                }))
                
                setCurrentStep(2) // Go directly to configuration
            } else {
                // Normal flow: analyze the request
                const result = await analyzeRequest(description)
                
                setAgentData(prev => ({
                    ...prev,
                    description,
                    questions: result.questions || []
                }))

                if (result.needsClarification) {
                    setCurrentStep(1)
                } else {
                    // Direct to configuration if no clarification needed
                    setAgentData(prev => ({
                        ...prev,
                        configuration: result.initialConfig
                    }))
                    setCurrentStep(2)
                }
            }
        } catch (error) {
            console.error('Failed to analyze request:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleClarificationSubmit = async (clarifications) => {
        setLoading(true)
        try {
            const config = await generateAgent(agentData.description, clarifications)
            
            setAgentData(prev => ({
                ...prev,
                clarifications,
                configuration: config
            }))
            
            setCurrentStep(2)
        } catch (error) {
            console.error('Failed to generate agent:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleDeployment = async (config) => {
        setAgentData(prev => ({
            ...prev,
            configuration: config
        }))
        setCurrentStep(3)
    }

    const handleDeploymentComplete = (agent) => {
        setAgentData(prev => ({
            ...prev,
            agent
        }))
        setCurrentStep(4)
    }

    const handleComplete = () => {
        if (onAgentCreated && agentData.agent) {
            onAgentCreated(agentData.agent)
        }
        onClose()
    }

    const steps = [
        {
            label: 'Describe Your Need',
            component: DescribeNeedStep,
            props: {
                onNext: handleDescriptionSubmit,
                initialValue: agentData.description
            }
        },
        {
            label: 'Clarify Requirements',
            component: ClarificationStep,
            props: {
                questions: agentData.questions,
                initialDescription: agentData.description,
                onSubmit: handleClarificationSubmit,
                onBack: () => setCurrentStep(0)
            }
        },
        {
            label: 'Review Configuration',
            component: ConfigurationStep,
            props: {
                configuration: agentData.configuration,
                onDeploy: handleDeployment,
                onBack: () => setCurrentStep(agentData.questions.length > 0 ? 1 : 0)
            }
        },
        {
            label: 'Deploy Agent',
            component: DeploymentStep,
            props: {
                configuration: agentData.configuration,
                onComplete: handleDeploymentComplete
            }
        },
        {
            label: 'Access Your Agent',
            component: AccessStep,
            props: {
                agent: agentData.agent,
                onClose: handleComplete
            }
        }
    ]

    const CurrentStepComponent = steps[currentStep].component
    const currentProps = steps[currentStep].props

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            fullScreen={fullScreen}
            PaperProps={{
                sx: { 
                    height: fullScreen ? '100%' : '90vh',
                    display: 'flex',
                    flexDirection: 'column'
                }
            }}
        >
            <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <IconSparkles size={24} />
                        <Typography variant="h6">Create AI Agent</Typography>
                    </Stack>
                    <IconButton onClick={onClose} size="small">
                        <IconX />
                    </IconButton>
                </Stack>
                {loading && (
                    <LinearProgress 
                        sx={{ 
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0
                        }} 
                    />
                )}
            </DialogTitle>
            
            <DialogContent sx={{ flex: 1, overflow: 'auto', p: 3 }}>
                {/* Stepper for desktop */}
                {!fullScreen && (
                    <Stepper activeStep={currentStep} sx={{ mb: 4 }}>
                        {steps.map((step, index) => (
                            <Step key={step.label}>
                                <StepLabel
                                    optional={
                                        index === currentStep && (
                                            <Typography variant="caption">
                                                {loading ? 'Processing...' : 'Current step'}
                                            </Typography>
                                        )
                                    }
                                >
                                    {step.label}
                                </StepLabel>
                            </Step>
                        ))}
                    </Stepper>
                )}

                {/* Mobile step indicator */}
                {fullScreen && (
                    <Box sx={{ mb: 3, textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary">
                            Step {currentStep + 1} of {steps.length}
                        </Typography>
                        <Typography variant="h6">
                            {steps[currentStep].label}
                        </Typography>
                    </Box>
                )}

                {/* Current step content */}
                <Box sx={{ minHeight: 0, flex: 1 }}>
                    <CurrentStepComponent {...currentProps} loading={loading} />
                </Box>
            </DialogContent>
        </Dialog>
    )
}

export default AgentCreatorDialog