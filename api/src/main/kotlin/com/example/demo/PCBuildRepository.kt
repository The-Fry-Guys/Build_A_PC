package com.example.demo

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

/* */
interface PCBuildRepository : JpaRepository<PCBuild, UUID> {
    fun findAllByUserId(userId: String): List<PCBuild>
}