# Mythical Mysfits: DevSecOps with Docker and AWS Fargate

## Lab 1 - Starting the DevSecOps Journey

In this lab, we are going to start building in DevSecOps. Security is everyone's responsibility and in today, you will ensure that you aren't checking in any AWS secrets like AWS Access and Secret Keys. 

Here's what you'll be doing:

* [Set up repos](#set-up-repos)
* [Build security right into git commits](#build-security-right-into-git-commits)
* [Remediation](#rsemediation)

### Set up repos

1\. Clone all repos

Up until now, Mythical Mysfits hasn't really been doing anything with source repos, so let's start checking things into repos like we're supposed to. First, you'll have to clone the pre-created repositories. You can get the git clone URLs from either the console or CLI. We'll do it from the CLI today. 

First, list your repositories:

<pre>
$ aws codecommit list-repositories
{
    "repositories": [
        {
            "repositoryName": "mythical-mysfits-devsecops-like-service",
            "repositoryId": "54763f98-c295-4189-a91a-7830ea085aae"
        },
        {
            "repositoryName": "mythical-mysfits-devsecops-monolith-service",
            "repositoryId": "c8aa761e-3ed1-4033-b830-4d9465b51087"
        }
    ]
}
</pre>

Next, use the batch-get-repositories command to get the clone URLs for both repositories, substituting the names you got from the previous CLI command:

<pre>
$ aws codecommit batch-get-repositories --repository-names mythical-mysfits-devsecops-monolith-service mythical-mysfits-devsecops-like-service
{
    "repositories": [
        {
            "repositoryName": "mythical-mysfits-devsecops-monolith-service",
            "cloneUrlSsh": "ssh://git-codecommit.eu-west-1.amazonaws.com/v1/repos/mythical-mysfits-devsecops-monolith-service",
            "lastModifiedDate": 1542588318.447,
            "repositoryDescription": "Repository for the Mythical Mysfits monolith service",
            "cloneUrlHttp": "https://git-codecommit.eu-west-1.amazonaws.com/v1/repos/mythical-mysfits-devsecops-monolith-service",
            "creationDate": 1542588318.447,
            "repositoryId": "c8aa761e-3ed1-4033-b830-4d9465b51087",
            "Arn": "arn:aws:codecommit:eu-west-1:123456789012:mythical-mysfits-devsecops-monolith-service",
            "accountId": "123456789012"
        },
        {
            "repositoryName": "mythical-mysfits-devsecops-like-service",
            "cloneUrlSsh": "ssh://git-codecommit.eu-west-1.amazonaws.com/v1/repos/mythical-mysfits-devsecops-like-service",
            "lastModifiedDate": 1542500073.535,
            "repositoryDescription": "Repository for the Mythical Mysfits like service",
            "cloneUrlHttp": "https://git-codecommit.eu-west-1.amazonaws.com/v1/repos/mythical-mysfits-devsecops-like-service",
            "creationDate": 1542500073.535,
            "repositoryId": "54763f98-c295-4189-a91a-7830ea085aae",
            "Arn": "arn:aws:codecommit:eu-west-1:123456789012:mythical-mysfits-devsecops-like-service",
            "accountId": "123456789012"
        }
    ],
    "repositoriesNotFound": []
}
</pre>

2\. Clone repos and copy in app code

Earlier in the workshop, we set up the CodeCommit credential helper, so for today, we'll use the HTTPS clone URLs instead of SSH. 

<pre>
$ cd ~/environment/
$ git clone <b><i>REPLACEME_LIKE_REPOSITORY_CLONEURL</b></i>
$ git clone <b><i>REPLACEME_MONOLITH_REPOSITORY_CLONEURL</b></i>
$ cp -R ~/environment/aws-modern-application-workshop-STAGING/workshop-2/app/like-service/* <b><i>REPLACEME_LIKE_REPOSITORY_NAME</b></i>
$ cp -R ~/environment/aws-modern-application-workshop-STAGING/workshop-2/app/monolith-service/* <b><i>REPLACEME_MONOLITH_REPOSITORY_NAME</b></i>
</pre>

### Build security right into git commits

Now that we have our repos cloned and are ready to start checking in, let's stop to think about security. Exposed access and secret keys are often very costly for companies and that's what we're going to try and avoid. To achieve this, we're going to use a project called [git-secrets](https://github.com/awslabs/git-secrets).

Git-Secrets scans commits, commit messages, and --no-ff merges to prevent adding secrets into your git repositories. If a commit, commit message, or any commit in a --no-ff merge history matches one of your configured prohibited regular expression patterns, then the commit is rejected.

1\. Install git-secrets

First thing's first. We have to install git-secrets and set it up. Clone the git-secrets repo:

<pre>
$ cd ~/environment/
$ git clone https://github.com/awslabs/git-secrets.git
</pre>

Install it as per the instructions on the [git-secrets GitHub page](https://github.com/awslabs/git-secrets#installing-git-secrets): 

<pre>
$ cd ~/environment/git-secrets/
$ sudo make install
$ git secrets --install
✓ Installed commit-msg hook to .git/hooks/commit-msg
✓ Installed pre-commit hook to .git/hooks/pre-commit
✓ Installed prepare-commit-msg hook to .git/hooks/prepare-commit-msg
</pre>

2\. Configure git-secrets

Git-secrets uses hooks within git to catch whether or not you're committing something you're not supposed to. We will install it into both the repos we cloned:

<pre>
$ git secrets --register-aws --global
OK
$ cd ~/environment/<b><i>REPLACEME_MONOLITH_REPOSITORY_NAME</b></i>
$ git secrets --install
$ cd ~/environment/<b><i>REPLACEME_LIKE_REPOSITORY_NAME</b></i>
$ git secrets --install
</pre>

3\. Check in code
<pre>
$ cd <b><i>REPLACEME_LIKE_REPOSITORY_NAME</b></i>
$ git add -A
$ git commit -m "Initial Commit of like-service repo"
</pre>

Did you run into any issues? **If not, go back to Lab 1 and make sure git secrets is working.**

### Remediation

1\. Stop following anti-patterns!

Looks like someone put in some secrets to our application. We should never have any sort of secrets directly built into the application. We have to fix this. This is the output you should have seen:

<pre>
service/mysfits_like.py:19:    # Boy I hope someone finds me: AKIAIOSFODNN7EXAMPLS

[ERROR] Matched one or more prohibited patterns

Possible mitigations:
- Mark false positives as allowed using: git config --add secrets.allowed ...
- Mark false positives as allowed by adding regular expressions to .gitallowed at repository's root directory
- List your configured patterns: git config --get-all secrets.patterns
- List your configured allowed patterns: git config --get-all secrets.allowed
- List your configured allowed patterns in .gitallowed at repository's root directory
- Use --no-verify if this is a one-time false positive
</pre>

If you see the above output, git-secrets is working. If not, go back to the [Build security right into git commits](#build-security-right-into-git-commits) section.

Open up the file and remove the line. This time, someone just left a commented access key in there so it's not being used, but it could have been bad.

2\. Check in the code again

Now that we've fixed the issue, let's try again.
<pre>
$ git add -A
$ git commit -m "Initial Commit of like-service repo"
$ git push origin master
</pre>

3\. Check the rest of the repos for AWS Credentials

Now let's make sure the rest of the repos don't have any access and secret keys checked in.

<pre>
$ cd ~/environment/<b><i>REPLACEME_MONOLITH_REPOSITORY_NAME</b></i>
$ git secrets --scan
$ cd ~/environment/<b><i>REPLACEME_LIKE_REPOSITORY_NAME</b></i>
$ git secrets --scan
</pre>

If there were no errors, looks like we're ok.

# Checkpoint

This short lab taught you how to start building in security right from the beginning before we even hit any sort of infrastructure. Now we can really get started.

Proceed to [Lab 2](../Lab-2)

