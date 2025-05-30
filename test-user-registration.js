#!/usr/bin/env node

/**
 * Script para probar el sistema de registro de usuarios en NubemGenesis
 * Uso: node test-user-registration.js
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// Configuración de prueba
const CONFIG = {
    baseUrl: 'https://nubemgenesis-zqvgtbn4ya-uc.a.run.app',
    testUsers: [
        {
            username: 'usuario_test',
            email: 'test@ejemplo.com',
            password: 'password123',
            firstName: 'Usuario',
            lastName: 'Prueba'
        },
        {
            username: 'user2',
            email: 'user2@test.com',
            password: 'mypassword',
            firstName: 'Segundo',
            lastName: 'Usuario'
        }
    ]
};

class UserRegistrationTester {
    constructor() {
        this.results = [];
    }

    makeRequest(method, url, data = null) {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
                path: urlObj.pathname + urlObj.search,
                method: method,
                timeout: 15000,
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'NubemGenesis-RegistrationTester/1.0'
                }
            };

            if (data) {
                const postData = JSON.stringify(data);
                options.headers['Content-Length'] = Buffer.byteLength(postData);
            }

            const client = urlObj.protocol === 'https:' ? https : http;
            
            const req = client.request(options, (res) => {
                let responseData = '';
                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                res.on('end', () => {
                    try {
                        const parsedData = responseData ? JSON.parse(responseData) : {};
                        resolve({
                            statusCode: res.statusCode,
                            data: parsedData,
                            headers: res.headers,
                            rawData: responseData
                        });
                    } catch {
                        resolve({
                            statusCode: res.statusCode,
                            data: responseData,
                            headers: res.headers,
                            rawData: responseData
                        });
                    }
                });
            });

            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            if (data) {
                req.write(JSON.stringify(data));
            }
            
            req.end();
        });
    }

    async testServiceStatus() {
        console.log('🔍 Verificando estado del servicio de autenticación...');
        
        try {
            const response = await this.makeRequest('GET', `${CONFIG.baseUrl}/api/v1/auth/status`);
            
            if (response.statusCode === 200) {
                console.log('✅ Servicio de autenticación disponible');
                console.log(`   Versión: ${response.data.version || 'N/A'}`);
                return true;
            } else {
                console.log(`❌ Servicio no disponible (Status: ${response.statusCode})`);
                return false;
            }
        } catch (error) {
            console.log(`❌ Error conectando al servicio: ${error.message}`);
            return false;
        }
    }

    async testUserRegistration(userData) {
        console.log(`\n📝 Probando registro de usuario: ${userData.username}`);
        
        try {
            const response = await this.makeRequest('POST', `${CONFIG.baseUrl}/api/v1/auth/register`, userData);
            
            const result = {
                username: userData.username,
                success: false,
                statusCode: response.statusCode,
                message: '',
                token: null
            };

            if (response.statusCode === 201) {
                result.success = true;
                result.message = 'Usuario registrado exitosamente';
                result.token = response.data.token;
                result.user = response.data.user;
                
                console.log('✅ Registro exitoso');
                console.log(`   ID: ${response.data.user?.id}`);
                console.log(`   Email: ${response.data.user?.email}`);
                console.log(`   Rol: ${response.data.user?.role}`);
                
            } else {
                result.message = response.data.error || `Error HTTP ${response.statusCode}`;
                console.log(`❌ Registro falló: ${result.message}`);
            }

            this.results.push(result);
            return result;

        } catch (error) {
            console.log(`❌ Error en registro: ${error.message}`);
            this.results.push({
                username: userData.username,
                success: false,
                statusCode: 0,
                message: error.message,
                token: null
            });
            return null;
        }
    }

    async testUserLogin(username, password) {
        console.log(`\n🔐 Probando login de usuario: ${username}`);
        
        try {
            const response = await this.makeRequest('POST', `${CONFIG.baseUrl}/api/v1/auth/login`, {
                emailOrUsername: username,
                password: password
            });

            if (response.statusCode === 200) {
                console.log('✅ Login exitoso');
                console.log(`   Usuario: ${response.data.user?.username}`);
                console.log(`   Último login: ${response.data.user?.lastLogin || 'Primera vez'}`);
                return {
                    success: true,
                    token: response.data.token,
                    user: response.data.user
                };
            } else {
                console.log(`❌ Login falló: ${response.data.error || 'Error desconocido'}`);
                return { success: false, message: response.data.error };
            }

        } catch (error) {
            console.log(`❌ Error en login: ${error.message}`);
            return { success: false, message: error.message };
        }
    }

    async testTokenVerification(token) {
        console.log('\n🔍 Verificando token JWT...');
        
        try {
            const response = await this.makeRequest('POST', `${CONFIG.baseUrl}/api/v1/auth/verify-token`, {
                token: token
            });

            if (response.statusCode === 200 && response.data.valid) {
                console.log('✅ Token válido');
                console.log(`   Usuario: ${response.data.user?.username}`);
                return true;
            } else {
                console.log('❌ Token inválido');
                return false;
            }

        } catch (error) {
            console.log(`❌ Error verificando token: ${error.message}`);
            return false;
        }
    }

    async runAllTests() {
        console.log('🚀 INICIANDO PRUEBAS DE REGISTRO DE USUARIOS\n');
        console.log('='.repeat(50));

        // 1. Verificar estado del servicio
        const serviceAvailable = await this.testServiceStatus();
        if (!serviceAvailable) {
            console.log('\n❌ No se puede continuar - servicio no disponible');
            return;
        }

        // 2. Probar registro de usuarios
        console.log('\n' + '='.repeat(50));
        console.log('📝 PROBANDO REGISTRO DE USUARIOS');
        
        let firstToken = null;
        for (const userData of CONFIG.testUsers) {
            const result = await this.testUserRegistration(userData);
            if (result && result.success && !firstToken) {
                firstToken = result.token;
            }
            await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar 1 segundo entre registros
        }

        // 3. Probar login con el primer usuario
        if (this.results.length > 0 && this.results[0].success) {
            console.log('\n' + '='.repeat(50));
            console.log('🔐 PROBANDO LOGIN');
            
            const firstUser = CONFIG.testUsers[0];
            const loginResult = await this.testUserLogin(firstUser.username, firstUser.password);
            
            // 4. Verificar token si el login fue exitoso
            if (loginResult.success && loginResult.token) {
                await this.testTokenVerification(loginResult.token);
            }
        }

        // 5. Mostrar resumen
        this.showSummary();
    }

    showSummary() {
        console.log('\n' + '='.repeat(50));
        console.log('📊 RESUMEN DE PRUEBAS');
        console.log('='.repeat(50));

        const successful = this.results.filter(r => r.success).length;
        const total = this.results.length;

        console.log(`✅ Registros exitosos: ${successful}/${total}`);
        console.log(`❌ Registros fallidos: ${total - successful}/${total}`);

        if (this.results.length > 0) {
            console.log('\n📋 Detalles:');
            this.results.forEach(result => {
                const status = result.success ? '✅' : '❌';
                console.log(`${status} ${result.username}: ${result.message}`);
            });
        }

        console.log('\n🎯 CONCLUSIÓN:');
        if (successful > 0) {
            console.log('✅ El sistema de registro de usuarios está funcionando correctamente');
            console.log('💡 Los usuarios pueden ahora registrarse en la aplicación');
        } else {
            console.log('❌ El sistema de registro necesita revisión');
            console.log('🔧 Verifica la configuración del backend y base de datos');
        }
    }
}

// Ejecutar las pruebas
async function main() {
    const tester = new UserRegistrationTester();
    await tester.runAllTests();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = UserRegistrationTester;