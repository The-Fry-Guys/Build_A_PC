package com.example.demo

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface PcBuildRepository : JpaRepository<PcBuild, UUID> {
    fun findAllByUserId(userId: String): List<PcBuild>
}