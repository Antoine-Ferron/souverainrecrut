import com.cloudbees.plugins.credentials.CredentialsScope
import com.cloudbees.plugins.credentials.SystemCredentialsProvider
import com.cloudbees.plugins.credentials.domains.Domain
import hudson.util.Secret
import org.jenkinsci.plugins.plaincredentials.impl.StringCredentialsImpl

// Modifier uniquement le jeton Sonar laisse les credentials saisis dans Jenkins intacts.
def store = SystemCredentialsProvider.getInstance().getStore()
def domain = Domain.global()
def token = new File('/run/secrets/sonar_token').getText('UTF-8').trim()
def entry = new StringCredentialsImpl(CredentialsScope.GLOBAL, 'sonar-token',
    'Analyse du projet SouverainRecrut', Secret.fromString(token))
def previous = store.getCredentials(domain).find { it.id == entry.id }
if (previous) {
    store.updateCredentials(domain, previous, entry)
} else {
    store.addCredentials(domain, entry)
}
