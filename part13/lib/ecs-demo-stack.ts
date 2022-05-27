import { Stack, StackProps } from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as ecs_patterns from "aws-cdk-lib/aws-ecs-patterns";
import { Construct } from "constructs";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class EcsDemoStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const repository = new ecr.Repository(this, 'esc-repo', {
      // TODO
    })

    const vpc = new ec2.Vpc(this, "vpc", {
      maxAzs: 3, // Default is all AZs in region
    });

    const cluster = new ecs.Cluster(this, "Cluster", {
      vpc: vpc,
    });

    // Create a load-balanced Fargate service and make it public
    const loadBalancedFargateService = new ecs_patterns.ApplicationLoadBalancedFargateService(
      this,
      "FargateService",
      {
        cluster: cluster, // Required
        cpu: 512, // Default is 256
        desiredCount: 6, // Default is 1
        taskImageOptions: {
          image: ecs.ContainerImage.fromRegistry(repository.repositoryUri),
        },
        memoryLimitMiB: 2048, // Default is 512
        publicLoadBalancer: true, // Default is false
      }
    );

    // ========= auto scale =========
    // const scalableTarget = loadBalancedFargateService.service.autoScaleTaskCount({
    //   minCapacity: 5,
    //   maxCapacity: 20,
    // });
    
    // scalableTarget.scaleOnSchedule('DaytimeScaleDown', {
    //   schedule: appscaling.Schedule.cron({ hour: '8', minute: '0'}),
    //   minCapacity: 1,
    // });
    
    // scalableTarget.scaleOnSchedule('EveningRushScaleUp', {
    //   schedule: appscaling.Schedule.cron({ hour: '20', minute: '0'}),
    //   minCapacity: 10,
    // });

    // ========= code pipeline =========
    // const project = new codebuild.PipelineProject(this, 'MyProject',{
    //   environment: {
    //     buildImage: codebuild.LinuxBuildImage.STANDARD_2_0,
    //     privileged: true
    //   },
    // });
    // const buildRolePolicy =  new iam.PolicyStatement({
    //   effect: iam.Effect.ALLOW,
    //   resources: ['*'],
    //   actions: [
    //             "ecr:GetAuthorizationToken",
    //             "ecr:BatchCheckLayerAvailability",
    //             "ecr:GetDownloadUrlForLayer",
    //             "ecr:GetRepositoryPolicy",
    //             "ecr:DescribeRepositories",
    //             "ecr:ListImages",
    //             "ecr:DescribeImages",
    //             "ecr:BatchGetImage",
    //             "ecr:InitiateLayerUpload",
    //             "ecr:UploadLayerPart",
    //             "ecr:CompleteLayerUpload",
    //             "ecr:PutImage"
    //         ]
    // });
    // project.addToRolePolicy(buildRolePolicy);
    
    // const sourceOutput = new codepipeline.Artifact();
    // const buildOutput = new codepipeline.Artifact();
    // const sourceAction = new codepipeline_actions.CodeCommitSourceAction({
    //   actionName: 'CodeCommit',
    //   repository: code,
    //   output: sourceOutput,
    // });
    // const buildAction = new codepipeline_actions.CodeBuildAction({
    //   actionName: 'CodeBuild',
    //   project,
    //   input: sourceOutput,
    //   outputs: [buildOutput],
    // });
    
    // new codepipeline.Pipeline(this, 'MyPipeline', {
    //   stages: [
    //     {
    //       stageName: 'Source',
    //       actions: [sourceAction],
    //     },
    //     {
    //       stageName: 'Build',
    //       actions: [buildAction],
    //     },
    //     {
    //       stageName: 'Deploy',
    //       actions: [
    //         new codepipeline_actions.EcsDeployAction({
    //           actionName: "ECS-Service",
    //           service: service, 
    //           input: buildOutput
    //         }
    //         )
    //       ]
    //     }
    //   ],
    // });
  }
}
