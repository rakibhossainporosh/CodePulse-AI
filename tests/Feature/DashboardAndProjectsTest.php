<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Review;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardAndProjectsTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_renders_with_kpi_metrics_and_recent_reviews(): void
    {
        $user = User::factory()->create();

        $project = Project::create([
            'user_id' => $user->id,
            'name' => 'Demo Project',
        ]);

        $review = Review::create([
            'user_id' => $user->id,
            'project_id' => $project->id,
            'language' => 'PHP',
            'source_code' => '<?php echo "test"; ?>',
            'focus_areas' => ['security'],
            'status' => 'completed',
            'overall_score' => 88,
        ]);

        $response = $this->actingAs($user)->get(route('dashboard'));

        $response->assertOk();
    }

    public function test_projects_page_renders_for_authenticated_user(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('projects.index'));

        $response->assertOk();
    }

    public function test_project_can_be_created(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post(route('projects.store'), [
            'name' => 'Payment Gateway',
            'description' => 'Stripe & PayPal microservice',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('projects', [
            'user_id' => $user->id,
            'name' => 'Payment Gateway',
        ]);
    }

    public function test_project_can_be_created_inline_via_json(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->postJson(route('projects.store'), [
                'name' => 'Auth Service',
                'description' => 'JWT Service',
            ]);

        $response->assertCreated();
        $response->assertJson([
            'success' => true,
            'project' => [
                'name' => 'Auth Service',
            ],
        ]);
    }

    public function test_user_cannot_delete_another_users_project(): void
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();

        $project = Project::create([
            'user_id' => $userA->id,
            'name' => 'Secret Project A',
        ]);

        $response = $this->actingAs($userB)->delete(route('projects.destroy', $project));
        $response->assertForbidden();

        $this->assertDatabaseHas('projects', ['id' => $project->id]);
    }

    public function test_user_can_delete_own_project(): void
    {
        $user = User::factory()->create();

        $project = Project::create([
            'user_id' => $user->id,
            'name' => 'Project to Delete',
        ]);

        $response = $this->actingAs($user)->delete(route('projects.destroy', $project));
        $response->assertRedirect();

        $this->assertDatabaseMissing('projects', ['id' => $project->id]);
    }
}
