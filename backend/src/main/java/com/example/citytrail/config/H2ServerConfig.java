package com.example.citytrail.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class H2ServerConfig {
    @Bean(initMethod = "start", destroyMethod = "stop")
    org.h2.tools.Server h2TcpServer() throws java.sql.SQLException {
        return org.h2.tools.Server.createTcpServer("-tcpPort", "9092", "-ifNotExists");
    }
}
