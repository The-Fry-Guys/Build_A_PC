package com.example.demo

import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface PCBuildRepository : JpaRepository<PCBuild, UUID> {
    fun findAllByUserId(userId: UUID, pageable: Pageable): Page<PCBuild>
}